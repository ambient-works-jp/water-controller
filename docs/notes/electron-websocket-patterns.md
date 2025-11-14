# Electron での WebSocket 接続パターン

## 概要

このドキュメントでは、Electron アプリで WebSocket サーバに接続する際の2つのアプローチ（Main プロセスでの接続 vs Renderer プロセスでの接続）について、メリット・デメリットを比較し、water-controller-app での推奨パターンを説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)

---

## 2つのアプローチ

### パターン1: Main プロセスで WebSocket 接続

```txt
WebSocket サーバ --WebSocket--> Main プロセス --IPC--> Renderer プロセス
```

Main プロセスで WebSocket 接続を確立し、受信したメッセージを IPC で Renderer プロセスに転送するパターン。

### パターン2: Renderer プロセスで WebSocket 接続

```txt
WebSocket サーバ --WebSocket--> Renderer プロセス
```

Renderer プロセスで直接 WebSocket 接続を確立するパターン。Web アプリと同じアプローチ。

---

## パターン1: Main プロセスで接続

### アーキテクチャ図

```txt
┌─────────────────────────────────────────┐
│  WebSocket サーバ                         │
│  (Rust relay server)                    │
└──────────────┬──────────────────────────┘
               │ WebSocket
               │
┌──────────────▼──────────────────────────┐
│  Main プロセス (Node.js)                  │
│  - WebSocket クライアント                  │
│  - 再接続ロジック                          │
│  - メッセージのバッファリング                 │
└──────────────┬──────────────────────────┘
               │ IPC (webContents.send)
               │
┌──────────────▼──────────────────────────┐
│  Renderer プロセス (React)                │
│  - IPC でメッセージを受信                   │
│  - UI に反映                              │
└─────────────────────────────────────────┘
```

### メリット

#### 1. 接続の永続性

- Renderer がリロードされても接続が維持される
- `Cmd + R` でページをリロードしても再接続不要
- 開発中の HMR（Hot Module Replacement）でも接続は切れない

#### 2. 単一接続

- Main プロセスは1つだけなので、WebSocket 接続も1つで済む
- 複数のウィンドウがある場合、接続を共有できる
- 接続リソースの節約

#### 3. バックグラウンド動作

- ウィンドウを閉じても、Main プロセスは動き続けるので接続を維持できる
- データを受信し続けて、必要に応じてウィンドウを再表示できる
- 例: 通知を受け取って新しいウィンドウを開く

#### 4. 複雑なロジックの実装

- Node.js 環境なので、以下のような実装が容易：
  - 複雑な再接続ロジック（バックオフアルゴリズムなど）
  - 認証トークンの管理と更新
  - ファイルへのログ保存
  - メッセージのバッファリングと再送

### デメリット

#### 1. IPC のオーバーヘッド

- WebSocket → Main → IPC → Renderer という2段階の通信
- リアルタイム性が若干低下する可能性がある（通常は数ミリ秒程度）

#### 2. 実装の複雑さ

- Main プロセスと Renderer プロセスの両方でコードが必要
- IPC のハンドラーを追加で実装する必要がある
- Preload スクリプトでの API 公開も必要

#### 3. デバッグの難しさ

- Main プロセスのログは Chrome DevTools では見れない
- ターミナルと DevTools の両方を確認する必要がある
- WebSocket の通信状態を DevTools の Network タブで確認できない

### コード例

```typescript
// src/main/index.ts
import { BrowserWindow, ipcMain } from 'electron'
import { WebSocket } from 'ws'

let ws: WebSocket | null = null
let mainWindow: BrowserWindow

function connectWebSocket() {
  ws = new WebSocket('ws://127.0.0.1:8080/ws')

  ws.on('open', () => {
    console.log('WebSocket connected')
    mainWindow.webContents.send('ws-status', 'connected')
  })

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      // Renderer にメッセージを送信
      mainWindow.webContents.send('ws-message', message)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  ws.on('close', () => {
    console.log('WebSocket disconnected')
    mainWindow.webContents.send('ws-status', 'disconnected')

    // 自動再接続（1秒後）
    setTimeout(() => connectWebSocket(), 1000)
  })
}

app.on('ready', () => {
  mainWindow = new BrowserWindow({ /* ... */ })
  connectWebSocket()
})

// Renderer からの切断リクエストを処理
ipcMain.on('ws-disconnect', () => {
  ws?.close()
})
```

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  onWsMessage: (callback: (message: any) => void) => {
    ipcRenderer.on('ws-message', (_event, message) => callback(message))
  },
  onWsStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('ws-status', (_event, status) => callback(status))
  },
  disconnectWs: () => ipcRenderer.send('ws-disconnect')
})
```

```typescript
// src/renderer/src/App.tsx
import { useEffect, useState } from 'react'

function App() {
  const [message, setMessage] = useState(null)
  const [status, setStatus] = useState('disconnected')

  useEffect(() => {
    // WebSocket メッセージを受信
    window.api.onWsMessage((msg) => {
      setMessage(msg)
    })

    // 接続状態を受信
    window.api.onWsStatus((s) => {
      setStatus(s)
    })
  }, [])

  return (
    <div>
      <div>接続状態: {status}</div>
      <div>メッセージ: {JSON.stringify(message)}</div>
    </div>
  )
}
```

---

## パターン2: Renderer プロセスで接続

### アーキテクチャ図

```txt
┌─────────────────────────────────────────┐
│  WebSocket サーバ                         │
│  (Rust relay server)                    │
└──────────────┬──────────────────────────┘
               │ WebSocket
               │
┌──────────────▼──────────────────────────┐
│  Renderer プロセス (React)                │
│  - WebSocket クライアント                  │
│  - 再接続ロジック                          │
│  - UI に直接反映                           │
└─────────────────────────────────────────┘
```

### メリット

#### 1. 実装のシンプルさ

- Web アプリと同じように書ける
- IPC の実装が不要
- Preload スクリプトでの API 公開も不要
- Main プロセスのコードが不要

#### 2. リアルタイム性

- IPC のオーバーヘッドがない
- WebSocket → Renderer の直接通信
- 入力からビジュアルへの反映が最速

#### 3. React との統合

- React のステート管理と直接統合できる
- `useEffect` や `useWebSocket` などの hooks がそのまま使える
- React の再レンダリングと自然に連携

#### 4. デバッグの簡単さ

- Chrome DevTools でネットワークタブを確認できる
- WebSocket のメッセージをリアルタイムで確認できる
- フレームの内容、送受信時刻、ペイロードを詳細に確認可能
- ブレークポイントも Renderer プロセス内で完結

#### 5. Web 版への移植

- 将来的に Web 版を作る場合、コードがそのまま使える
- PWA（Progressive Web App）への移行も容易
- ブラウザでのテストも可能

### デメリット

#### 1. 接続の非永続性

- Renderer がリロードされると接続が切れる
- `Cmd + R` でページをリロードすると再接続が必要
- HMR でも再接続が発生する（開発時のみ）

#### 2. 複数ウィンドウ対応

- 複数のウィンドウがある場合、それぞれが接続する必要がある
- 接続数が増える
- サーバ側の負荷が増加する可能性

#### 3. バックグラウンド動作不可

- ウィンドウを閉じると接続が切れる
- バックグラウンドでのデータ受信ができない

### コード例

```typescript
// src/renderer/src/hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react'

interface ControllerInputMessage {
  type: 'controller-input'
  left: 0 | 1 | 2
  right: 0 | 1 | 2
  up: 0 | 1 | 2
  down: 0 | 1 | 2
}

interface ButtonInputMessage {
  type: 'button-input'
  isPushed: boolean
}

type WsMessage = ControllerInputMessage | ButtonInputMessage

export function useWebSocket(url: string) {
  const [message, setMessage] = useState<WsMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    function connect() {
      console.log('Connecting to WebSocket...')
      const socket = new WebSocket(url)

      socket.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsMessage
          setMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      socket.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      socket.onclose = () => {
        console.log('WebSocket disconnected')
        setConnectionStatus('disconnected')

        // 自動再接続（1秒後）
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('Reconnecting...')
          connect()
        }, 1000)
      }

      wsRef.current = socket
    }

    connect()

    // クリーンアップ
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [url])

  return { message, connectionStatus }
}
```

```typescript
// src/renderer/src/App.tsx
import { useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'

function App() {
  const { message, connectionStatus } = useWebSocket('ws://127.0.0.1:8080/ws')

  useEffect(() => {
    if (message?.type === 'controller-input') {
      console.log('Controller input:', message)
      // ビジュアルコンテンツに反映
    } else if (message?.type === 'button-input') {
      console.log('Button input:', message)
      // コンテンツ切り替え
    }
  }, [message])

  return (
    <div>
      <div>接続状態: {connectionStatus}</div>
      {/* コンテンツ */}
    </div>
  )
}
```

---

## 比較表

| 項目 | Main で接続 | Renderer で接続 |
|------|------------|----------------|
| **実装の複雑さ** | ❌ やや複雑（IPC必要） | ✅ シンプル（Web と同じ） |
| **コード量** | ❌ 多い（Main + Preload + Renderer） | ✅ 少ない（Renderer のみ） |
| **リアルタイム性** | ⚠️ IPC のオーバーヘッドあり（数ms） | ✅ 直接通信（最速） |
| **接続の永続性** | ✅ リロードでも維持 | ❌ リロードで切断 |
| **HMR での影響** | ✅ 接続は維持される | ❌ 再接続が必要（開発時のみ） |
| **バックグラウンド動作** | ✅ ウィンドウを閉じても接続維持 | ❌ ウィンドウを閉じると切断 |
| **デバッグ** | ⚠️ ターミナルで確認 | ✅ Chrome DevTools で確認 |
| **複数ウィンドウ** | ✅ 接続を共有可能 | ❌ 各ウィンドウで接続 |
| **Web 版への移植** | ❌ コード書き直し必要 | ✅ そのまま使える |
| **React との統合** | ⚠️ IPC を経由 | ✅ 直接統合可能 |
| **再接続ロジック** | ✅ Node.js で実装しやすい | ⚠️ ブラウザ環境の制約あり |

---

## water-controller-app での推奨

### 推奨：Renderer プロセスで直接接続

**理由**：

#### 1. 単一ウィンドウアプリ

- 複数ウィンドウで接続を共有する必要がない
- Main プロセスでの一元管理のメリットが少ない

#### 2. リアルタイム性が重要

- 水コントローラの入力をすぐにビジュアルに反映したい
- IPC のオーバーヘッド（数ミリ秒）も避けたい
- 入力の遅延は体験に直結する

#### 3. デバッグのしやすさ

- 開発中は Chrome DevTools で WebSocket の通信を確認できる方が便利
- デバッグモードでの可視化との相性が良い
- Network タブで接続状態、メッセージの内容を確認できる

#### 4. シンプルな実装

- Web 開発の知識がそのまま使える
- React の hooks でステート管理と統合しやすい
- チーム内での理解が容易（一般的なパターン）

#### 5. リロードは問題ない

- 展示会では基本的にリロードしない
- 開発中のリロードは、再接続してもデバッグには支障がない
- 自動再接続を実装すれば1秒程度で復帰

### ただし、以下の場合は Main プロセスでの接続を検討すべき

#### バックグラウンドでもデータを受信し続ける必要がある

**例**：

- ウィンドウを閉じてもデータを記録し続けたい
- バックグラウンドで通知を受け取りたい

#### 複数のウィンドウで同じデータを共有する

**例**：

- メイン画面とデバッグ画面を別ウィンドウで表示
- 設定画面とコンテンツ画面を分離

#### 非常に複雑な再接続ロジックが必要

**例**：

- 認証トークンの更新
- エラーログの保存
- メッセージのバッファリングと再送
- 指数バックオフアルゴリズム

#### サーバ側の接続数制限がある

**例**：

- 開発中に複数のウィンドウを開くと接続数制限に引っかかる
- Main で一元管理して接続数を1つに保つ

---

## 実装ガイド：Renderer で接続（推奨パターン）

### 1. TypeScript 型定義

```typescript
// src/renderer/src/types/websocket.ts
export interface ControllerInputMessage {
  type: 'controller-input'
  left: 0 | 1 | 2
  right: 0 | 1 | 2
  up: 0 | 1 | 2
  down: 0 | 1 | 2
}

export interface ButtonInputMessage {
  type: 'button-input'
  isPushed: boolean
}

export type WsMessage = ControllerInputMessage | ButtonInputMessage

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
```

### 2. カスタム Hook の実装

```typescript
// src/renderer/src/hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react'
import type { WsMessage, ConnectionStatus } from '../types/websocket'

interface UseWebSocketOptions {
  url: string
  reconnectInterval?: number  // デフォルト: 1000ms
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    reconnectInterval = 1000,
    onOpen,
    onClose,
    onError
  } = options

  const [message, setMessage] = useState<WsMessage | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    function connect() {
      console.log(`[WebSocket] Connecting to ${url}...`)
      const socket = new WebSocket(url)

      socket.onopen = () => {
        console.log('[WebSocket] Connected')
        setConnectionStatus('connected')
        onOpen?.()
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsMessage
          setMessage(data)
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error)
        }
      }

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        onError?.(error)
      }

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected')
        setConnectionStatus('disconnected')
        onClose?.()

        // 自動再接続
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('[WebSocket] Reconnecting...')
          connect()
        }, reconnectInterval)
      }

      wsRef.current = socket
    }

    connect()

    // クリーンアップ
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [url, reconnectInterval, onOpen, onClose, onError])

  return {
    message,
    connectionStatus,
    ws: wsRef.current
  }
}
```

### 3. App での使用

```typescript
// src/renderer/src/App.tsx
import { useEffect, useState } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import type { ControllerInputMessage } from './types/websocket'

function App() {
  const [controllerInput, setControllerInput] = useState<ControllerInputMessage | null>(null)

  const { message, connectionStatus } = useWebSocket({
    url: 'ws://127.0.0.1:8080/ws',
    reconnectInterval: 1000,
    onOpen: () => console.log('WebSocket opened'),
    onClose: () => console.log('WebSocket closed')
  })

  useEffect(() => {
    if (message?.type === 'controller-input') {
      setControllerInput(message)
      // ビジュアルコンテンツに反映
    } else if (message?.type === 'button-input') {
      if (message.isPushed) {
        // コンテンツ切り替え
      }
    }
  }, [message])

  return (
    <div>
      {/* デバッグモード時の表示 */}
      <div className="debug-overlay">
        <div>接続状態: {connectionStatus}</div>
        {controllerInput && (
          <div>
            <div>Left: {controllerInput.left}</div>
            <div>Right: {controllerInput.right}</div>
            <div>Up: {controllerInput.up}</div>
            <div>Down: {controllerInput.down}</div>
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <ContentRenderer input={controllerInput} />
    </div>
  )
}
```

### 4. エラーハンドリング

```typescript
// src/renderer/src/hooks/useWebSocket.ts（エラーハンドリング強化版）
export function useWebSocket(options: UseWebSocketOptions) {
  // ... 前述のコードに加えて

  const [error, setError] = useState<string | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10

  useEffect(() => {
    function connect() {
      // 最大再接続回数チェック
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        setError(`Failed to connect after ${maxReconnectAttempts} attempts`)
        return
      }

      console.log(`[WebSocket] Connecting to ${url}... (attempt ${reconnectAttemptsRef.current + 1})`)
      const socket = new WebSocket(url)

      socket.onopen = () => {
        console.log('[WebSocket] Connected')
        setConnectionStatus('connected')
        setError(null)
        reconnectAttemptsRef.current = 0  // リセット
        onOpen?.()
      }

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        setError('WebSocket connection error')
        onError?.(error)
      }

      socket.onclose = () => {
        console.log('[WebSocket] Disconnected')
        setConnectionStatus('disconnected')
        onClose?.()

        reconnectAttemptsRef.current++

        // 指数バックオフ（最大10秒）
        const backoffTime = Math.min(reconnectInterval * Math.pow(2, reconnectAttemptsRef.current), 10000)

        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('[WebSocket] Reconnecting...')
          connect()
        }, backoffTime)
      }

      wsRef.current = socket
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      wsRef.current?.close()
    }
  }, [url, reconnectInterval, onOpen, onClose, onError])

  return {
    message,
    connectionStatus,
    error,
    ws: wsRef.current
  }
}
```

---

## まとめ

### water-controller-app での推奨パターン

**Renderer プロセスで直接 WebSocket 接続を行う**:

**メリット**：

- ✅ 実装がシンプル（Web 開発と同じ）
- ✅ リアルタイム性が高い（IPC なし）
- ✅ デバッグが簡単（Chrome DevTools）
- ✅ React と自然に統合

**デメリット**：

- ⚠️ リロードで再接続が必要（展示会では問題なし）
- ⚠️ バックグラウンド動作不可（必要性なし）

### 実装時のポイント

1. **自動再接続を実装する**
   - 接続が切れても自動で再接続
   - 指数バックオフで負荷を軽減

2. **エラーハンドリングを適切に行う**
   - 接続エラーをユーザーに表示
   - 最大再接続回数を設定

3. **デバッグモードで接続状態を可視化**
   - 接続状態（connecting/connected/disconnected）
   - 受信したメッセージの内容

4. **TypeScript で型安全に**
   - メッセージの型を定義
   - 型ガードで安全にパース

---

## 参考資料

### 公式ドキュメント

- [WebSocket API (MDN)](https://developer.mozilla.org/ja/docs/Web/API/WebSocket)
- [Electron IPC ガイド](https://www.electronjs.org/ja/docs/latest/tutorial/ipc)
- [Electron プロセスモデル](https://www.electronjs.org/ja/docs/latest/tutorial/process-model)

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)
- [タスクドキュメント：デスクトップアプリの WebSocket と UI 開発](../tasks/20251113-140000_desktop-app-websocket-and-ui.md)

### プロジェクト内の関連ファイル

- `water-controller-app/src/renderer/src/hooks/useWebSocket.ts` - WebSocket カスタム Hook（実装予定）
- `water-controller-app/src/renderer/src/types/websocket.ts` - WebSocket 型定義（実装予定）
- `spec.md` - 通信仕様
