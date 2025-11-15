# TypeScript の型定義ファイル：index.ts と index.d.ts の違い

## 概要

このドキュメントでは、TypeScript における `index.ts` と `index.d.ts` の違いと役割、Electron プロジェクトでの使い分けについて説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [contextIsolation（コンテキスト分離）](./electron-context-isolation.md)
- [Electron 開発ガイドライン](../electron-development-guidelines.md)

---

## `index.ts` と `index.d.ts` の基本的な違い

### `index.ts`（実装ファイル）

**役割**: TypeScript のソースコード（**実装**）を記述するファイル

```typescript
// index.ts - 実装を含む
export function greet(name: string): string {
  return `Hello, ${name}!`  // ✅ 実装がある
}

export class User {
  constructor(public name: string) {}  // ✅ 実装がある

  sayHello(): string {
    return `Hello, I'm ${this.name}`  // ✅ 実装がある
  }
}
```

**特徴**:

- ✅ 実際の処理（実装）が書かれている
- ✅ TypeScript コンパイラが JavaScript にコンパイルする
- ✅ ランタイムで実行される

### `index.d.ts`（型定義ファイル / Declaration file）

**役割**: 型情報のみを記述するファイル

```typescript
// index.d.ts - 型定義のみ
export function greet(name: string): string  // ❌ 実装はない

export class User {
  name: string  // ❌ 実装はない
  constructor(name: string)
  sayHello(): string
}
```

**特徴**:

- ✅ 型情報だけが書かれている（シグネチャのみ）
- ❌ 実装は含まれていない
- ✅ TypeScript コンパイラが型チェックに使用
- ❌ JavaScript にコンパイルされない（型情報は消える）

---

## 具体的な使い分け

### パターン1: `index.ts` のみ（最も一般的）

自分で実装を書く場合は、`.ts` ファイルだけで十分です。

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}
```

TypeScript コンパイラが自動的に型情報を推論するため、`.d.ts` ファイルは不要です。

### パターン2: JavaScript ライブラリに型定義を追加

**既存の JavaScript ライブラリ**に TypeScript の型を付けたい場合に `.d.ts` を使います。

```javascript
// myLib.js (JavaScript ファイル - すでに存在)
export function greet(name) {
  return `Hello, ${name}!`
}
```

```typescript
// myLib.d.ts (型定義ファイル - 後から追加)
export function greet(name: string): string
```

これで、TypeScript から `myLib.js` を使うときに型チェックが効くようになります。

### パターン3: npm パッケージの型定義

npm で公開されているライブラリの型定義を提供する場合。

```txt
my-library/
├── dist/
│   ├── index.js        # コンパイル済み JavaScript（実装）
│   └── index.d.ts      # 型定義ファイル
├── src/
│   └── index.ts        # TypeScript ソースコード
└── package.json
```

`package.json` で型定義ファイルを指定：

```json
{
  "name": "my-library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"  // ← 型定義ファイルの場所
}
```

---

## Electron プロジェクトでの使用例

### water-controller-app での構成

```txt
water-controller-app/
├── src/
│   ├── preload/
│   │   ├── index.ts           # ✅ 実装（contextBridge で API を公開）
│   │   └── index.d.ts         # ✅ 型定義（API の型）
│   └── renderer/
│       └── src/
│           └── env.d.ts       # ✅ グローバル型定義（window.api の型）
```

### `src/preload/index.ts`（実装ファイル）

```typescript
// src/preload/index.ts - 実装ファイル
import { contextBridge, ipcRenderer } from 'electron'

// 型をインポート
import type { RendererApi } from './index'

// ✅ 実際に API を公開する実装
const api: RendererApi = {
  getVersions: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),
  ipc: {
    sendPing: async () => ipcRenderer.invoke('ping')
  }
}

// ✅ contextBridge で Renderer に公開
contextBridge.exposeInMainWorld('api', api)
```

### `src/preload/index.d.ts`（型定義ファイル）

```typescript
// src/preload/index.d.ts - 型定義ファイル

// ✅ API の型定義（実装はない）
export type RendererApi = {
  getVersions: () => {
    electron: string
    chrome: string
    node: string
  }
  ipc: {
    sendPing: () => Promise<PingResponse>
  }
}

export type PingResponse = {
  message: string
  timestamp: number
}
```

### `src/renderer/src/env.d.ts`（グローバル型定義）

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />

// ✅ Preload の型をインポート
import type { RendererApi } from '../../preload/index'

// ✅ window オブジェクトの型を拡張
declare global {
  interface Window {
    api: RendererApi
  }
}
```

### Renderer での使用

```typescript
// src/renderer/src/App.tsx
function App() {
  const [versions, setVersions] = useState<{
    electron: string
    chrome: string
    node: string
  } | null>(null)

  useEffect(() => {
    // ✅ window.api の型が効いている
    const v = window.api.getVersions()
    setVersions(v)

    // ✅ 型安全に IPC を呼び出せる
    window.api.ipc.sendPing().then((response) => {
      console.log(response.message)  // 型が効いている
    })
  }, [])

  return (
    <div>
      {versions && (
        <ul>
          <li>Electron: {versions.electron}</li>
          <li>Chrome: {versions.chrome}</li>
          <li>Node: {versions.node}</li>
        </ul>
      )}
    </div>
  )
}
```

---

## `.d.ts` ファイルが必要なケース

### 1. 外部ライブラリの型定義

```typescript
// node_modules/@types/lodash/index.d.ts
export function map<T, U>(
  collection: T[],
  iteratee: (value: T) => U
): U[]

export function filter<T>(
  collection: T[],
  predicate: (value: T) => boolean
): T[]
```

### 2. グローバル型の宣言

```typescript
// src/types/global.d.ts
declare global {
  interface Window {
    api: RendererApi
    myCustomProperty: string
  }

  const VERSION: string
  const BUILD_DATE: string
}

export {}  // ← このファイルをモジュールとして扱う（重要）
```

### 3. モジュールの型定義（JavaScript ライブラリ用）

```typescript
// types/my-js-library.d.ts
declare module 'my-js-library' {
  export function doSomething(x: number): string
  export class MyClass {
    constructor(name: string)
    getName(): string
  }
}
```

---

## TypeScript コンパイル時の動作

### `.ts` ファイルのコンパイル

```bash
# src/index.ts をコンパイル
tsc src/index.ts
```

**結果**:

```txt
dist/
├── index.js      # コンパイルされた JavaScript（実装）
└── index.d.ts    # 自動生成された型定義ファイル
```

### `tsconfig.json` での設定

```json
{
  "compilerOptions": {
    "declaration": true,      // ← .d.ts ファイルを自動生成
    "declarationMap": true,   // ← .d.ts.map も生成（デバッグ用）
    "outDir": "./dist"
  }
}
```

---

## tsconfig の役割分担（Electron プロジェクト）

water-controller-app では、複数の `tsconfig` を使い分けています。

### `tsconfig.node.json`（Main / Preload 用）

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.node.json",
  "include": [
    "electron.vite.config.*",
    "src/main/**/*",
    "src/preload/**/*"  // ✅ Preload の実装ファイルを含める
  ],
  "compilerOptions": {
    "composite": true,
    "types": ["electron-vite/node"]
  }
}
```

**役割**:

- Main プロセスと Preload スクリプトの TypeScript をコンパイル
- Preload の **実装ファイル** (`index.ts`) をここでコンパイルする

### `tsconfig.web.json`（Renderer 用）

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": [
    "src/renderer/src/**/*",
    "src/renderer/src/env.d.ts"  // ✅ グローバル型定義のみ含める
    // ⚠️ src/preload/*.ts は含めない！
  ],
  "compilerOptions": {
    "composite": true,
    "types": ["vite/client"]
  }
}
```

**重要なポイント**:

- ❌ `src/preload/*.ts` を `include` に含めない
- ✅ Renderer からは Preload の **型定義のみ**を参照する
- ✅ `env.d.ts` で `window.api` の型を宣言する

**理由**:

- 同一パスに `index.ts` と `index.d.ts` が存在する場合、TypeScript は `.ts` を優先して読み込む
- Renderer プロジェクトが `index.ts` を読み込むと、対応する `index.d.ts` が無視される
- 結果：Renderer で `window.api` の型が解決できず、エラーになる

---

## トラブルシューティング

### 問題1: Renderer で `window.api` が `unknown` になる

**症状**:

```typescript
// src/renderer/src/App.tsx
window.api.sendPing()  // ❌ Error: Property 'sendPing' does not exist on type 'unknown'
```

**原因**:

- Renderer 用 `tsconfig` (`tsconfig.web.json`) の `include` に `src/preload/*.ts` が含まれている
- `.ts` を含めると対応する `.d.ts` が無視されるため、グローバル宣言が効かなくなる

**解決策**:

```json
// tsconfig.web.json
{
  "include": [
    "src/renderer/src/**/*",
    "src/renderer/src/env.d.ts"
    // ❌ "src/preload/**/*" は含めない
  ]
}
```

### 問題2: `Cannot write file ... because it would overwrite input file.`

**症状**:

```txt
error TS5055: Cannot write file '.../index.d.ts' because it would overwrite input file.
```

**原因**:

- 同じ `.d.ts` を複数の `tsconfig` から出力対象として扱っている

**解決策**:

- Renderer 用の `tsconfig` では `.d.ts` を参照専用とし、バンドル対象には含めない
- `declaration: false` を設定するか、`outDir` を分ける

---

## まとめ

### 基本的な違い

| ファイル | 役割 | 内容 | コンパイル結果 |
|---------|------|------|--------------|
| **`index.ts`** | 実装 | 実際の処理（実装）を記述 | JavaScript (`.js`) に変換される |
| **`index.d.ts`** | 型定義 | 型情報のみを記述 | コンパイルされない（型情報は消える） |

### 使い分け

| ケース | 使うファイル |
|--------|------------|
| **自分で実装を書く** | `.ts` のみ |
| **JavaScript ライブラリに型を付ける** | `.d.ts` を追加 |
| **npm パッケージを公開** | `.js`（実装）と `.d.ts`（型定義）の両方 |
| **グローバル型を定義** | `.d.ts` |

### 覚え方

- **`.ts`**: TypeScript のソースコード（**実装**がある）
- **`.d.ts`**: TypeScript の **D**eclaration file（**型定義のみ**、実装なし）

### Electron プロジェクトでのベストプラクティス

1. ✅ Preload では `index.ts`（実装）と `index.d.ts`（型定義）を両方用意
2. ✅ Renderer では `env.d.ts` で `window.api` の型を宣言
3. ✅ Renderer 用 `tsconfig` では Preload の `.ts` を含めない（`.d.ts` のみ参照）
4. ✅ `import type` を使って型のみをインポート

---

## Q&A

### Q1: `env.d.ts` が用意されているのはなぜ？現状空のままだが問題ない？

**A**: `env.d.ts` の主な目的は、**Vite の環境変数の型を定義すること**です。現在空のままでも動作しますが、以下の理由から最低限の内容を含めることを推奨します。

#### `env.d.ts` の本来の役割

**1. Vite の環境変数の型定義（最も重要）**:

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />

// ✅ Vite の環境変数の型を拡張
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_WS_URL: string
  readonly VITE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

これにより、Renderer プロセスで型安全に環境変数を使えます：

```typescript
// src/renderer/src/App.tsx
const wsUrl = import.meta.env.VITE_WS_URL  // ✅ 型が効いている（string）
const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true'
```

**2. グローバル型の拡張（オプション）**:

`window.api` などのグローバル型も宣言できます（後述のアプローチ1参照）。

#### 現在の構成で `env.d.ts` が空の理由

`tsconfig.web.json` で `src/preload/*.d.ts` を直接含めている場合：

```json
// tsconfig.web.json
{
  "include": [
    "src/renderer/src/**/*",
    "src/preload/*.d.ts"  // ✅ 直接含めている
  ]
}
```

この場合、`window.api` の型宣言を `env.d.ts` で行う必要はありません。

ただし、**`env.d.ts` は Vite の型定義のために残すべき**です：

```typescript
// src/renderer/src/env.d.ts（最小限の構成）
/// <reference types="vite/client" />

// 環境変数を使用する場合は型を追加
interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  readonly VITE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

### Q2: `preload/*.d.ts` を `tsconfig.web.json` に含める場合の注意点は？

**A**: `preload/index.d.ts` に **`declare global` でのグローバル宣言が必要**です。

#### 必要な設定

```typescript
// src/preload/index.d.ts

// ✅ API の型定義
export type RendererApi = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
}

// ✅ グローバル宣言が必要（これがないと window.api の型が解決されない）
declare global {
  interface Window {
    api: RendererApi
  }
}
```

**重要**: `declare global` がない場合、`window.api` の型は `unknown` になります。

#### この構成での `env.d.ts`

```typescript
// src/renderer/src/env.d.ts（Vite の型のみ）
/// <reference types="vite/client" />

// Vite の環境変数の型（必要に応じて）
interface ImportMetaEnv {
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

---

### Q3: 2つのアプローチの違いは？どちらが推奨？

**A**: グローバル型の宣言をどこで行うかの違いです。

#### アプローチ1: `env.d.ts` で `window.api` を宣言（推奨）

**tsconfig.web.json**:

```json
{
  "include": [
    "src/renderer/src/**/*"
    // ❌ preload/*.d.ts は含めない
  ]
}
```

**src/preload/index.d.ts**（型定義のみ）:

```typescript
// ✅ 型定義のみ、グローバル宣言なし
export type RendererApi = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
}
```

**src/renderer/src/env.d.ts**（グローバル宣言はここ）:

```typescript
/// <reference types="vite/client" />

import type { RendererApi } from '../../preload/index'

// ✅ グローバル宣言は Renderer 側で行う
declare global {
  interface Window {
    api: RendererApi
  }
}

// Vite の環境変数の型
interface ImportMetaEnv {
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**利点**:

- ✅ 関心の分離：Preload は型定義のみ、Renderer はグローバル宣言
- ✅ `env.d.ts` に Vite と `window.api` の型がまとまっている
- ✅ Renderer 側で型をコントロールできる

#### アプローチ2: `preload/*.d.ts` を直接含める（現在の構成）

**tsconfig.web.json**:

```json
{
  "include": [
    "src/renderer/src/**/*",
    "src/preload/*.d.ts"  // ✅ 直接含める
  ]
}
```

**src/preload/index.d.ts**（型定義 + グローバル宣言）:

```typescript
// ✅ 型定義
export type RendererApi = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
}

// ✅ グローバル宣言も Preload 側で行う
declare global {
  interface Window {
    api: RendererApi
  }
}
```

**src/renderer/src/env.d.ts**（Vite の型のみ）:

```typescript
/// <reference types="vite/client" />

// Vite の環境変数の型
interface ImportMetaEnv {
  readonly VITE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**利点**:

- ✅ Preload の型定義とグローバル宣言が同じ場所にある
- ✅ `env.d.ts` はシンプルになる

**欠点**:

- ⚠️ Preload と Renderer の境界が曖昧になる
- ⚠️ 同じパスに `index.ts` が存在する場合、TypeScript が `.ts` を優先する可能性がある

#### 推奨

**アプローチ1（`env.d.ts` で宣言）を推奨**します。理由：

1. ✅ Renderer に関連する型は Renderer 側で管理
2. ✅ Preload は純粋に型定義のみを提供
3. ✅ Vite と Electron の型が `env.d.ts` に集約される
4. ✅ より明確な責務の分離

---

### Q4: `env.d.ts` を完全に空にしても問題ない？

**A**: 技術的には動作しますが、**推奨しません**。

#### 最低限含めるべき内容

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />
```

この1行があることで、Vite の基本的な型（`import.meta.env` など）が解決されます。

#### 環境変数を使用する場合

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  readonly VITE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

これにより、環境変数の型チェックが効きます：

```typescript
// ✅ 型安全
const wsUrl = import.meta.env.VITE_WS_URL  // string

// ❌ 型エラー
const invalid = import.meta.env.VITE_INVALID_VAR  // エラー
```

---

### Q5: 実装ファイル（`.ts`）と型定義ファイル（`.d.ts`）が同じパスにあると問題が起きる？

**A**: はい、**TypeScript は `.ts` を優先**するため、問題が起きる可能性があります。

#### 問題が起きるケース

```txt
src/preload/
├── index.ts       # 実装ファイル
└── index.d.ts     # 型定義ファイル
```

**tsconfig.web.json で `src/preload/*.ts` を含めた場合**:

```json
// tsconfig.web.json
{
  "include": [
    "src/renderer/src/**/*",
    "src/preload/**/*"  // ❌ .ts も含まれる
  ]
}
```

**結果**:

- TypeScript は `index.ts` を読み込む
- 対応する `index.d.ts` が無視される
- `index.d.ts` 内の `declare global` が効かない
- `window.api` の型が `unknown` になる

#### 解決策

**方法1**: Renderer 用の `tsconfig` では `.d.ts` のみを含める

```json
// tsconfig.web.json
{
  "include": [
    "src/renderer/src/**/*",
    "src/preload/*.d.ts"  // ✅ .d.ts のみ
  ]
}
```

**方法2**: `env.d.ts` で `import type` を使う（推奨）

```json
// tsconfig.web.json
{
  "include": [
    "src/renderer/src/**/*"
    // preload は含めない
  ]
}
```

```typescript
// src/renderer/src/env.d.ts
import type { RendererApi } from '../../preload/index'

declare global {
  interface Window {
    api: RendererApi
  }
}
```

この場合、TypeScript は自動的に `index.d.ts` から型を読み込みます。

---

## 参考資料

### TypeScript 公式ドキュメント

- **[Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)**
  - `.d.ts` ファイルの基本
- **[Type Declarations](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html)**
  - 型宣言の詳細
- **[Global Modifying Modules](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-modifying-module-d-ts.html)**
  - グローバル型の拡張方法

### Electron 公式ドキュメント

- **[TypeScript Support](https://www.electronjs.org/docs/latest/tutorial/typescript)**
  - Electron での TypeScript 使用方法

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [contextIsolation（コンテキスト分離）](./electron-context-isolation.md)
- [Electron 開発ガイドライン](../electron-development-guidelines.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)

### プロジェクト内の関連ファイル

- `water-controller-app/src/preload/index.ts` - Preload の実装
- `water-controller-app/src/preload/index.d.ts` - Preload の型定義
- `water-controller-app/src/renderer/src/env.d.ts` - グローバル型定義
- `water-controller-app/tsconfig.node.json` - Main / Preload 用設定
- `water-controller-app/tsconfig.web.json` - Renderer 用設定
