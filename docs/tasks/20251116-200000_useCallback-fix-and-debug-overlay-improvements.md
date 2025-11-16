# タスク: useCallback 修正とデバッグオーバーレイの改善

**作成日時**: 2025-11-16 20:00:00 (JST)
**ステータス**: 完了

## ゴール

1. React の useCallback を使った正しいイベントハンドラの実装
2. WebSocket 接続の CSP エラー修正
3. WebSocket 接続テスト機能の追加
4. デバッグオーバーレイの UI 調整（サイズ、間隔、アニメーション）

## 背景

前セッションで実装した設定パネルとキーボードショートカットに以下の課題があった:

- `Cmd+M` キーボードショートカットで設定画面が閉じない（stale closure 問題）
- 設定保存処理が無限ループする
- WebSocket 接続が CSP エラーでブロックされる
- WebSocket 接続テスト機能がない
- デバッグオーバーレイのボタンサイズや間隔が調整必要
- Low/High 入力レベルでアニメーションの強度を変えたい

## タスク一覧

### 1. useCallback ドキュメントの作成

**ステータス**: ✅ 完了

**内容**:

- useCallback の用途、メリット、デメリットを整理
- Stale closure 問題の説明
- 本プロジェクトでの具体的な問題と解決策を記録

**成果物**:

- `docs/tasks/notes/how-to-use-useCallback.md`

**要点**:

1. **JavaScript の関数参照と等価性**:
   - 関数はオブジェクトであり、毎回新しい参照が生成される
   - React はコンポーネント再レンダリング時に関数を再生成する

2. **Stale closure 問題**:
   - useEffect や useCallback の依存配列が空の場合、初回レンダリング時の状態をキャプチャ
   - 状態が更新されても、クロージャ内の値は古いまま

3. **解決策**:
   - useState の関数形式: `setState((prev) => newValue)` を使う
   - 必要な依存を依存配列に追加する
   - useRef で値を保持して依存を避ける

### 2. App.tsx の useCallback 修正

**ステータス**: ✅ 完了

**内容**:

- `handleCloseSettings` と `handleToggleSettings` を useCallback でラップ
- setState の関数形式を使用して stale closure を回避
- キーボードショートカットの依存配列に handleToggleSettings を追加

**変更ファイル**:

- `src/renderer/src/App.tsx`

**変更内容**:

```typescript
// useCallback のインポート追加
import { useEffect, useState, useCallback, useRef } from 'react'

// handleCloseSettings を useCallback でラップ
const handleCloseSettings = useCallback((): void => {
  console.log('[Settings] Starting close animation')
  setIsClosingSettings(true)
  setTimeout(() => {
    console.log('[Settings] Close animation complete, hiding panel')
    setShowSettings(false)
    setIsClosingSettings(false)
  }, 500)
}, [])

// handleToggleSettings を useCallback でラップ、関数形式の setState を使用
const handleToggleSettings = useCallback((): void => {
  setShowSettings((prev) => {
    console.log('[Settings] Toggle called, current showSettings:', prev)
    if (prev) {
      // 閉じる処理
      console.log('[Settings] Starting close animation')
      setIsClosingSettings(true)
      setTimeout(() => {
        console.log('[Settings] Close animation complete, hiding panel')
        setShowSettings(false)
        setIsClosingSettings(false)
      }, 500)
      return prev // すぐには変更しない（アニメーション後に変更）
    } else {
      // 開く処理
      return true
    }
  })
}, [])

// キーボードショートカットに依存を追加
useKeyboardShortcut(
  [
    {
      key: 'm',
      handler: handleToggleSettings,
      description: '設定画面を開く'
    },
    // ...
  ],
  [handleToggleSettings] // 依存配列に追加
)
```

### 3. 設定保存の無限ループ修正

**ステータス**: ✅ 完了

**内容**:

- useRef を使って config を保持し、useEffect の依存配列から config を削除
- debugMode 変更時のみ設定保存が実行されるようにする

**変更ファイル**:

- `src/renderer/src/App.tsx`

**変更内容**:

```typescript
// useRef のインポート追加（既に追加済み）
import { useEffect, useState, useCallback, useRef } from 'react'

// config を useRef で保持
const configRef = useRef<Config | null>(config)

// config が変更されたら ref を更新
useEffect(() => {
  configRef.current = config
}, [config])

// debugMode 変更時に設定を保存（config は依存配列から除外）
useEffect(() => {
  // 初回ロード時はスキップ
  if (isInitialLoad) {
    return
  }

  const saveDebugMode = async (): Promise<void> => {
    const currentConfig = configRef.current
    if (!currentConfig) return

    const updatedConfig: Config = {
      ...currentConfig,
      debugMode
    }

    try {
      const response = await window.api.ipc.saveConfig(updatedConfig)
      if (response.success) {
        console.log('[Config] Debug mode saved:', debugMode)
      } else {
        console.error('[Config] Failed to save debug mode:', response.error)
      }
    } catch (error) {
      console.error('[Config] Failed to save debug mode:', error)
    }
  }

  void saveDebugMode()
}, [debugMode, isInitialLoad]) // config は依存配列に含めない
```

### 4. CSP エラーの修正

**ステータス**: ✅ 完了

**内容**:

- Content Security Policy の `connect-src` ディレクティブを追加
- WebSocket 接続を許可するように設定

**変更ファイル**:

- `src/renderer/index.html`

**変更内容**:

```html
<!-- Before -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
/>

<!-- After -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:* ws://localhost:*"
/>
```

### 5. CSP ドキュメントの作成

**ステータス**: ✅ 完了

**内容**:

- Content Security Policy の概要説明
- connect-src ディレクティブの詳細
- セキュリティのベストプラクティス

**成果物**:

- `docs/tasks/notes/content-security-policy-connect-src.md`

**要点**:

1. **CSP とは**:
   - ブラウザに許可するリソースの読み込み元を制限するセキュリティ機構
   - XSS、データインジェクション攻撃を防ぐ

2. **connect-src ディレクティブ**:
   - fetch、XMLHttpRequest、WebSocket、EventSource などの接続先を制限
   - 明示的に設定しない場合、default-src がフォールバックとして使用される

3. **本プロジェクトでの設定**:
   - `'self'`: 同一オリジンからの接続を許可
   - `ws://127.0.0.1:*`: ローカルホストの任意のポートへの WebSocket 接続を許可
   - `ws://localhost:*`: localhost の任意のポートへの WebSocket 接続を許可

### 6. WebSocket 接続テスト機能の追加

**ステータス**: ✅ 完了

**内容**:

- 設定画面の「接続状態」タブに接続テストボタンを追加
- WebSocket 接続の成功/失敗を判定して表示
- 101 Switching Protocols レスポンスで成功判定

**変更ファイル**:

- `src/renderer/src/components/SettingsPanel.tsx`

**変更内容**:

```typescript
// 状態管理
const [connectionTestResult, setConnectionTestResult] = useState<string>('')
const [isTestingConnection, setIsTestingConnection] = useState(false)

// WebSocket 接続テスト
const handleTestConnection = async (): Promise<void> => {
  setIsTestingConnection(true)
  setConnectionTestResult('')
  setErrorMessage(null)
  setSuccessMessage(null)

  try {
    const testWs = new WebSocket(wsUrl)
    let isSuccess = false

    // タイムアウト設定（10秒）
    const timeout = setTimeout(() => {
      if (!isSuccess) {
        testWs.close(1000, 'Test timeout')
        setConnectionTestResult('❌ 接続テスト失敗: タイムアウト（10秒）')
        setIsTestingConnection(false)
      }
    }, 10000)

    testWs.onopen = () => {
      clearTimeout(timeout)
      isSuccess = true
      setConnectionTestResult('✅ 接続テスト成功: 101 Switching Protocols')
      setSuccessMessage('WebSocket サーバへの接続に成功しました')
      setIsTestingConnection(false)
      // 少し待ってから正常終了コード (1000) で閉じる
      setTimeout(() => {
        testWs.close(1000, 'Connection test successful')
      }, 100)
    }

    testWs.onerror = (error) => {
      if (!isSuccess) {
        clearTimeout(timeout)
        console.error('WebSocket test error:', error)
        setConnectionTestResult('❌ 接続テスト失敗: エラーが発生しました')
        setErrorMessage('WebSocket サーバへの接続に失敗しました')
        setIsTestingConnection(false)
      }
    }

    testWs.onclose = (event) => {
      if (!isSuccess) {
        clearTimeout(timeout)
        setConnectionTestResult(
          `❌ 接続テスト失敗: 接続が閉じられました (code: ${event.code}, reason: ${event.reason || '不明'})`
        )
        setErrorMessage('WebSocket 接続が予期せず閉じられました')
        setIsTestingConnection(false)
      }
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    setConnectionTestResult('❌ 接続テスト失敗: 例外が発生しました')
    setErrorMessage('接続テストに失敗しました')
    setIsTestingConnection(false)
  }
}
```

UI 部分:

```typescript
<div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
  <button
    className="reload-button"
    onClick={() => window.location.reload()}
  >
    再接続
  </button>
  <button
    className="reload-button"
    onClick={handleTestConnection}
    disabled={isTestingConnection}
  >
    {isTestingConnection ? '接続テスト中...' : '接続テスト'}
  </button>
</div>

{connectionTestResult && (
  <div className="connection-test-result" style={{ marginBottom: '24px' }}>
    <p style={{ margin: 0, fontSize: '14px' }}>{connectionTestResult}</p>
  </div>
)}
```

**修正内容（レースコンディション対策）**:

接続テストで成功と失敗が同時に表示される問題を修正:

- `isSuccess` フラグを追加
- `onopen` で `isSuccess = true` を設定
- `onerror` と `onclose` で `isSuccess` をチェックしてからエラー表示
- `onopen` で `close()` を呼ぶ前に 100ms の遅延を追加

### 7. デバッグオーバーレイのサイズ調整

**ステータス**: ✅ 完了

**内容**:

- 十字キーのボタンサイズを Button と同じ 80px に変更
- さらに 0.9 倍して 72px に調整

**変更ファイル**:

- `src/renderer/src/components/DebugOverlay.css`

**変更内容**:

```css
.dpad-button {
  width: 72px;   /* 100px → 80px → 72px (0.9x) */
  height: 72px;
  /* ... */
}

.dpad-spacer {
  width: 72px;   /* 100px → 80px → 72px */
  height: 72px;
}
```

### 8. デバッグオーバーレイの間隔調整

**ステータス**: ✅ 完了

**内容**:

- 全体コンテナの padding を増やす: 28px → 32px
- debug-info-container の gap を増やす: 28px → 32px
- controller-visualization の gap を増やす: 40px → 60px
- controller-dpad の gap を増やす: 6px → 12px → 16px

**変更ファイル**:

- `src/renderer/src/components/DebugOverlay.css`

**変更内容**:

```css
.debug-info-container {
  /* ... */
  padding: 32px;  /* 28px → 32px */
  /* ... */
  gap: 32px;  /* 28px → 32px */
}

.controller-visualization {
  display: flex;
  gap: 60px;  /* 40px → 60px */
  align-items: center;
}

.controller-dpad {
  /* ... */
  gap: 16px;  /* 6px → 12px → 16px */
  /* ... */
}
```

### 9. デバッグオーバーレイのボタン位置修正

**ステータス**: ✅ 完了

**内容**:

- Grid の中央列/行を 80px に変更（中央ボタン用）
- `align-items: center` と `justify-items: center` を追加して位置を調整

**変更ファイル**:

- `src/renderer/src/components/DebugOverlay.css`

**変更内容**:

```css
.controller-dpad {
  display: grid;
  grid-template-columns: 72px 80px 72px;  /* 中央列を 80px に */
  grid-template-rows: 72px 80px 72px;     /* 中央行を 80px に */
  gap: 16px;
  align-items: center;      /* 縦方向の中央揃え */
  justify-items: center;    /* 横方向の中央揃え */
}
```

### 10. 入力レベル別アニメーションの実装

**ステータス**: ✅ 完了

**内容**:

- Low 入力時（InputLevel = 1）: 50% の控えめなアニメーション
- High 入力時（InputLevel = 2）: 100% の強めのアニメーション
- CSS クラス `active-low` と `active-high` を追加
- TypeScript で `getInputLevelClass()` 関数を実装

**変更ファイル**:

- `src/renderer/src/components/DebugOverlay.css`
- `src/renderer/src/components/DebugOverlay.tsx`

**CSS 変更内容**:

```css
/* Low 入力時（控えめなアニメーション） */
.dpad-button.active-low {
  background: rgba(74, 222, 128, 0.15);      /* 0.3 → 0.15 (50%) */
  border-color: rgba(74, 222, 128, 0.6);
  color: rgba(74, 222, 128, 0.8);
  transform: scale(1.025);                    /* 1.05 → 1.025 (50%) */
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);  /* 20px → 10px (50%) */
}

/* High 入力時（強めのアニメーション） */
.dpad-button.active-high {
  background: rgba(74, 222, 128, 0.3);
  border-color: #4ade80;
  color: #4ade80;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
}

/* 後方互換性のため .active クラスも残す（High として扱う） */
.dpad-button.active {
  background: rgba(74, 222, 128, 0.3);
  border-color: #4ade80;
  color: #4ade80;
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
}
```

**TypeScript 変更内容**:

```typescript
const getInputLevelClass = (level: InputLevel): string => {
  switch (level) {
    case 0:
      return ''
    case 1:
      return 'active-low'
    case 2:
      return 'active-high'
    default:
      return ''
  }
}

// JSX で使用
<div className={`dpad-button ${getInputLevelClass(controllerState.up)}`}>
  ↑<span className="input-level">{getInputLevelLabel(controllerState.up)}</span>
</div>
```

## 成果物

### 新規作成されたファイル

1. `docs/tasks/notes/how-to-use-useCallback.md`
   - useCallback の使い方、stale closure 問題の説明

2. `docs/tasks/notes/content-security-policy-connect-src.md`
   - CSP の概要、connect-src ディレクティブの説明

### 変更されたファイル

1. `src/renderer/src/App.tsx`
   - useCallback, useRef のインポート追加
   - handleCloseSettings, handleToggleSettings を useCallback でラップ
   - configRef で config を保持して無限ループを回避
   - キーボードショートカットの依存配列に handleToggleSettings を追加

2. `src/renderer/index.html`
   - CSP の connect-src ディレクティブを追加

3. `src/renderer/src/components/SettingsPanel.tsx`
   - WebSocket 接続テスト機能を追加
   - connectionTestResult, isTestingConnection 状態を追加
   - handleTestConnection 関数を実装
   - 接続テストボタンと結果表示の UI を追加

4. `src/renderer/src/components/DebugOverlay.css`
   - ボタンサイズを 72px に調整
   - 間隔を増やす（padding, gap）
   - Grid レイアウトを調整（中央列/行を 80px に）
   - align-items, justify-items を追加
   - active-low, active-high クラスを追加

5. `src/renderer/src/components/DebugOverlay.tsx`
   - getInputLevelClass 関数を追加
   - JSX で getInputLevelClass を使用

## 確認項目

- [x] Cmd+M で設定画面が開閉する（アニメーション付き）
- [x] 設定保存が無限ループしない
- [x] WebSocket 接続が CSP エラーなく成功する
- [x] 接続テストボタンで WebSocket 接続をテストできる
- [x] 接続テスト成功時に「✅ 接続テスト成功: 101 Switching Protocols」が表示される
- [x] 接続テスト失敗時に適切なエラーメッセージが表示される
- [x] 成功と失敗のメッセージが同時に表示されない
- [x] デバッグオーバーレイの十字キーボタンが 72px × 72px
- [x] デバッグオーバーレイの間隔が適切に広がっている
- [x] 中央ボタンが正しく中央に配置されている
- [x] Low 入力時（InputLevel = 1）のアニメーションが 50% の強度
- [x] High 入力時（InputLevel = 2）のアニメーションが 100% の強度

## 学んだこと

### React Hooks のベストプラクティス

1. **useCallback の適切な使用**:
   - イベントハンドラは useCallback でラップする
   - setState の関数形式を使って stale closure を回避
   - 依存配列を正しく設定する

2. **useRef の活用**:
   - 値を保持しつつ再レンダリングを避けたい場合に使用
   - useEffect の依存配列から除外できる

3. **useEffect の依存配列管理**:
   - 必要最小限の依存のみを含める
   - 無限ループを避けるため、setState で更新する値を依存に含めない

### Content Security Policy

1. **CSP の重要性**:
   - XSS 攻撃などのセキュリティリスクを軽減
   - ブラウザレベルでリソースの読み込みを制限

2. **connect-src ディレクティブ**:
   - WebSocket 接続には明示的な許可が必要
   - 開発環境では localhost/127.0.0.1 を許可
   - 本番環境では具体的なドメインを指定すべき

### WebSocket 接続テスト

1. **レースコンディションへの対応**:
   - 成功フラグで状態を管理
   - イベントハンドラで適切にチェック
   - タイムアウト処理で異常系を検出

2. **WebSocket のライフサイクル**:
   - `onopen`: 接続成功（101 Switching Protocols）
   - `onerror`: 接続エラー
   - `onclose`: 接続終了（正常終了は code 1000）

## 備考

- useCallback のドキュメントは今後の開発で参照用に保存
- CSP のドキュメントは本番デプロイ時のセキュリティ設定の参考資料
- デバッグオーバーレイの UI 調整は展示会場での視認性を考慮
- Low/High 入力レベルのアニメーション差分は視覚的フィードバックの改善
