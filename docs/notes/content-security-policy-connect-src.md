# Content Security Policy (CSP) の connect-src ディレクティブ

## Content Security Policy (CSP) とは

**Content Security Policy (CSP)** は、Web ページのセキュリティを強化するための仕組みです。HTML の `<meta>` タグや HTTP ヘッダーで設定することで、ブラウザに「どのリソースを読み込んでいいか」「どんな操作を許可するか」を指示できます。

主な目的：

- **XSS (Cross-Site Scripting) 攻撃の防止**: 悪意のあるスクリプトの実行を防ぐ
- **データインジェクション攻撃の防止**: 不正なデータの読み込みを防ぐ
- **クリックジャッキング攻撃の防止**: 不正なフレーム埋め込みを防ぐ

## connect-src ディレクティブとは

`connect-src` は CSP のディレクティブ（指示）の一つで、**ネットワーク接続を許可するリソースの URL を制限**します。

### 対象となる接続

`connect-src` が制限する接続の種類：

1. **XMLHttpRequest**: 従来の AJAX リクエスト
2. **fetch API**: モダンな HTTP リクエスト
3. **WebSocket**: リアルタイム双方向通信（`ws://` または `wss://`）
4. **EventSource**: サーバー送信イベント (Server-Sent Events)
5. **Navigator.sendBeacon**: アナリティクス送信用の API

### なぜ connect-src が必要なのか

`connect-src` を設定しないと、デフォルトで `default-src` の設定が適用されます。

```html
<!-- connect-src を明示的に設定していない例 -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'"
/>
```

この場合：

- `default-src 'self'` が `connect-src` にも適用される
- **同じオリジン（self）への接続のみ**許可される
- 外部 API や WebSocket サーバへの接続がブロックされる

## 今回のプロジェクトでの問題

### 問題の発生

Water Controller アプリでは、以下のような CSP 設定になっていました：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
/>
```

この設定では：

- `connect-src` が明示的に設定されていない
- `default-src 'self'` がフォールバックとして適用される
- **WebSocket 接続がブロックされる**

### エラーメッセージ

```txt
Refused to connect to 'ws://127.0.0.1:8080/ws' because it violates the following
Content Security Policy directive: "default-src 'self'".
Note that 'connect-src' was not explicitly set, so 'default-src' is used as a fallback.
```

このエラーは：

1. `ws://127.0.0.1:8080/ws` への接続が試行された
2. `connect-src` が設定されていないため、`default-src 'self'` が適用された
3. `ws://127.0.0.1:8080/ws` は現在のオリジンと異なる（プロトコルが `http(s)` ではなく `ws`）
4. 接続がブロックされた

### 解決方法

`connect-src` ディレクティブを明示的に追加し、WebSocket 接続を許可します：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data:;
           connect-src 'self' ws://127.0.0.1:* ws://localhost:*"
/>
```

## connect-src の設定値の意味

### 基本的な値

| 値 | 意味 |
|---|---|
| `'self'` | 現在のオリジン（同じドメイン・プロトコル・ポート）への接続を許可 |
| `'none'` | すべての接続を禁止 |
| `*` | すべてのオリジンへの接続を許可（推奨されない） |
| `https://example.com` | 特定のドメインへの接続を許可 |
| `https://*.example.com` | サブドメインを含む接続を許可 |
| `ws://127.0.0.1:*` | 127.0.0.1 の全ポートへの WebSocket 接続を許可 |
| `wss://example.com` | 特定ドメインへの安全な WebSocket 接続を許可 |

### 今回の設定の詳細

```txt
connect-src 'self' ws://127.0.0.1:* ws://localhost:*
```

- **`'self'`**: 同じオリジンへの HTTP/HTTPS 接続を許可
  - 例: `https://current-domain.com/api` への fetch リクエスト
- **`ws://127.0.0.1:*`**: 127.0.0.1 の任意のポートへの WebSocket 接続を許可
  - 例: `ws://127.0.0.1:8080/ws`、`ws://127.0.0.1:3000/websocket`
- **`ws://localhost:*`**: localhost の任意のポートへの WebSocket 接続を許可
  - 例: `ws://localhost:8080/ws`、`ws://localhost:3000/websocket`

### なぜワイルドカード `*` を使うのか

開発環境では、サーバのポート番号が変わる可能性があります：

- 開発サーバが `8080` で起動することもあれば、`8081` で起動することもある
- テスト環境と本番環境でポート番号が異なる

`ws://127.0.0.1:*` のようにワイルドカードを使うことで、ポート番号に依存しない設定ができます。

## セキュリティ上の注意点

### 開発環境 vs 本番環境

今回の設定は**開発環境向け**です：

```html
<!-- 開発環境向け（ローカルホストのみ許可） -->
connect-src 'self' ws://127.0.0.1:* ws://localhost:*
```

**本番環境**では、より厳密な設定にするべきです：

```html
<!-- 本番環境向け（具体的なドメインとポートを指定） -->
connect-src 'self' wss://api.example.com:8080
```

本番環境での推奨事項：

1. **プロトコルを `wss://` (WebSocket Secure) にする**: 暗号化された接続を使う
2. **ワイルドカードを避ける**: 具体的なドメインとポートを指定する
3. **HTTPS を使う**: HTTP ではなく HTTPS でアプリを提供する

### 避けるべき設定

```html
<!-- ❌ すべての接続を許可（危険！） -->
connect-src *

<!-- ❌ すべての WebSocket 接続を許可（危険！） -->
connect-src ws://* wss://*
```

これらの設定は、悪意のあるサイトへの接続を許してしまうため、**絶対に使わないでください**。

## その他の CSP ディレクティブ

| ディレクティブ | 制限対象 | 例 |
|---|---|---|
| `default-src` | すべてのリソースのデフォルト（フォールバック） | `default-src 'self'` |
| `script-src` | JavaScript の読み込み元 | `script-src 'self' https://cdn.example.com` |
| `style-src` | CSS の読み込み元 | `style-src 'self' 'unsafe-inline'` |
| `img-src` | 画像の読み込み元 | `img-src 'self' data: https://images.example.com` |
| `font-src` | フォントの読み込み元 | `font-src 'self' https://fonts.googleapis.com` |
| `connect-src` | ネットワーク接続先 | `connect-src 'self' wss://ws.example.com` |
| `media-src` | 動画・音声の読み込み元 | `media-src 'self' https://videos.example.com` |
| `object-src` | `<object>`, `<embed>`, `<applet>` の読み込み元 | `object-src 'none'` |
| `frame-src` | `<iframe>` の読み込み元 | `frame-src 'self' https://trusted.example.com` |
| `worker-src` | Web Worker の読み込み元 | `worker-src 'self'` |
| `manifest-src` | Web App Manifest の読み込み元 | `manifest-src 'self'` |

## 実際の設定例

### 最小限の設定（開発環境）

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; connect-src 'self' ws://localhost:*"
/>
```

### 現実的な設定（開発環境）

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data:;
           connect-src 'self' ws://127.0.0.1:* ws://localhost:*"
/>
```

### 本番環境向けの設定例

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self' https://cdn.example.com;
           style-src 'self' https://cdn.example.com;
           img-src 'self' data: https://images.example.com;
           connect-src 'self' https://api.example.com wss://ws.example.com;
           font-src 'self' https://fonts.googleapis.com;
           object-src 'none';
           base-uri 'self';
           form-action 'self';
           frame-ancestors 'none';
           upgrade-insecure-requests"
/>
```

## Electron アプリでの CSP

Electron アプリでは、CSP は特に重要です：

1. **デフォルトで CSP が有効**: Electron は security-conscious なので、デフォルトで厳しい CSP が適用されます
2. **レンダラープロセスの保護**: 悪意のあるコンテンツがメインプロセスにアクセスするのを防ぎます
3. **ローカルファイルとネットワークリソースの分離**: ローカルファイルシステムとネットワークリソースを分けて管理します

### Electron での推奨事項

```html
<!-- Electron アプリの推奨 CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           style-src 'self' 'unsafe-inline';
           img-src 'self' data:;
           connect-src 'self' ws://127.0.0.1:* ws://localhost:*;
           font-src 'self';
           object-src 'none';
           base-uri 'self'"
/>
```

注意点：

- `'unsafe-inline'` は CSS でのみ使用（JavaScript では避ける）
- `object-src 'none'` で Flash などのプラグインをブロック
- `base-uri 'self'` で `<base>` タグの URL を制限

## デバッグ方法

### CSP 違反を確認する

ブラウザの開発者ツール（DevTools）のコンソールで、CSP 違反を確認できます：

```
Refused to connect to 'ws://127.0.0.1:8080/ws' because it violates the
following Content Security Policy directive: "default-src 'self'".
Note that 'connect-src' was not explicitly set, so 'default-src' is used as a fallback.
```

### CSP レポート機能

CSP 違反をサーバに報告する設定もできます：

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           connect-src 'self' ws://localhost:*;
           report-uri /csp-violation-report"
/>
```

これにより、CSP 違反が発生すると、`/csp-violation-report` エンドポイントに違反内容が送信されます。

## まとめ

### connect-src の役割

- **ネットワーク接続を制限**する CSP ディレクティブ
- XMLHttpRequest、fetch、WebSocket、EventSource などが対象
- 明示的に設定しないと `default-src` がフォールバックとして使われる

### 今回の修正

```html
<!-- 修正前 -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; ..."
/>
<!-- WebSocket 接続がブロックされる -->

<!-- 修正後 -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
           script-src 'self';
           connect-src 'self' ws://127.0.0.1:* ws://localhost:*;
           ..."
/>
<!-- WebSocket 接続が許可される -->
```

### セキュリティのベストプラクティス

1. **開発環境では緩めの設定、本番環境では厳密な設定**
2. **ワイルドカード `*` は避ける**（開発環境を除く）
3. **HTTPS / WSS を使う**（本番環境では必須）
4. **具体的なドメインとポートを指定する**（本番環境では必須）
5. **定期的に CSP 設定を見直す**

## 参考リンク

- [MDN: Content Security Policy (CSP)](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)
- [MDN: CSP: connect-src](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/)
