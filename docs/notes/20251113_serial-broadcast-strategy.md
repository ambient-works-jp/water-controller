# シリアル読み取りとブロードキャスト戦略

## 概要

WebSocket クライアントが接続していない時に `broadcast_tx.send()` が失敗して warn ログが出続ける問題と、その解決策についてまとめる。

## 問題

`water-controller-relay` では、シリアルポートから水コントローラの入力を読み取り、WebSocket 経由でクライアントにブロードキャストする。しかし、クライアントが接続していない状態で `broadcast_tx.send()` を呼ぶと、送信先がないため以下のような warn ログが継続的に出力される：

```
WARN Failed to broadcast button-input
WARN Failed to broadcast controller-input
```

これはログが冗長になり、実際のエラーが埋もれてしまう可能性がある。

## 解決策

### アプローチ：接続チェック後に送信

`tokio::sync::broadcast::Sender` には `receiver_count()` メソッドがあり、現在の受信者（接続中のクライアント）数を取得できる。これを利用して、**接続がある時だけ送信する**ように制御する。

```rust
// 接続中のクライアントがいる場合のみ送信
if broadcast_tx.receiver_count() > 0 {
    if let Err(e) = broadcast_tx.send(json) {
        warn!(error = %e, "Failed to broadcast");
    }
}
```

### メリット

- シンプルな実装（条件分岐を追加するだけ）
- 不要な送信処理とログ出力を回避
- シリアル読み取り自体は継続するので、接続時に即座にデータが流れる

## シリアル読み取りは常に実行すべき理由

`read_line()` とパース処理は、WebSocket 接続の有無に関わらず**常に実行する必要がある**。

### 理由

1. **シリアルポートにはバッファが存在する**
   - OS レベル + ハードウェアレベルでデータがバッファリングされる
   - バッファサイズには限界がある

2. **バッファオーバーフロー時の挙動**
   - バッファが満杯になると、新しいデータが破棄される、または古いデータが上書きされる
   - 実装やドライバに依存

3. **再接続時に古いデータを読むリスク**
   - WebSocket クライアントが接続した瞬間、バッファに溜まった**古いデータ**を一気に読み込む
   - リアルタイム性が失われ、数秒前のコントローラ入力が送信される可能性

### ベストプラクティス

```rust
loop {
    // 常にシリアルを読み取る（バッファクリア）
    let line = match self.read_line() {
        Ok(line) => line,
        Err(err) => {
            warn!(error = %err, "Failed to read serial line");
            continue;
        }
    };

    // パースも常に実行
    match parse_input_line(&line) {
        Ok(input) => {
            // 接続中のクライアントがいる場合のみブロードキャスト
            if broadcast_tx.receiver_count() > 0 {
                // メッセージ作成 & 送信
            }
        }
        Err(err) => {
            warn!(error = %err, raw_line = %line, "Failed to parse serial line");
        }
    }
}
```

## 実装箇所

- `water-controller-relay/src/serial/reader.rs` の `run_read_loop()` メソッド

## 関連資料

- Tokio broadcast channel: https://docs.rs/tokio/latest/tokio/sync/broadcast/
