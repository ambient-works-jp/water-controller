# Electron Preload と Renderer の型共有メモ

最終更新: 2025-11-15

## 背景

- `contextIsolation: true` を有効にした Electron プロジェクトでは、Preload と Renderer は別コンテキストで動作する。
- Renderer から Preload で公開した API (`window.api` など) を安全に利用するためには、TypeScript で適切に型定義を共有する必要がある。
- `tsconfig` の `include` 設定によって、どのファイルがどの TypeScript プロジェクトに含まれるかが変わり、型解決の挙動が変わる。

## 型定義の公開戦略

### 1. Preload で公開する API を型で表現する

- Preload 側 (`src/preload`) にて、Renderer へ公開したい API の型を `.d.ts` もしくは `.ts` に定義する。
- 例: `src/preload/api.d.ts` 内で `RendererApi`, `PingResponse` などを宣言する。
- Preload 実装 (`index.ts`) では、その型を利用して `contextBridge.exposeInMainWorld('api', api)` を行い、実体を注入する。

### 2. Renderer プロジェクトに型だけを読み込ませる

- `tsconfig.web.json` (Renderer 用) の `include` には `src/renderer/src/env.d.ts` 等の宣言ファイルを含める。
- **ポイント:** `src/preload/*.ts` を `tsconfig.web.json` の `include` に含めない。
  - 同一パスに `index.ts` と `index.d.ts` が存在する場合、TypeScript は `.ts` を優先して読み込む。
  - Renderer プロジェクトが `index.ts` を読み込むと、対応する `index.d.ts` が無視され、`declare global { interface Window { api: ... } }` の宣言が適用されなくなる。
  - 結果: Renderer で `window.api` の型が解決できず、エラーになる。
- Renderer からは “公開されたインターフェース” のみを参照するのが目的のため、型定義ファイルだけを含める構成が合理的。

### 3. グローバル拡張は Renderer 側の宣言ファイルで行う

- `src/renderer/src/env.d.ts` など、Renderer プロジェクトに含まれる `.d.ts` 内で `declare global { interface Window { ... } }` を記述する。
- ここで Preload 側の型 (`RendererApi` など) を `import type` で参照し、`window.api` の型を明示する。
- これにより Renderer では `window.api.ipc.sendPing()` 等を型安全に利用できる。

## tsconfig の役割分担

| tsconfig | 用途 | include の例 | 備考 |
| --- | --- | --- | --- |
| `tsconfig.node.json` | Main / Preload 用 | `src/main/**/*`, `src/preload/**/*` | Preload 実装 (`index.ts`) をここでコンパイルする |
| `tsconfig.web.json` | Renderer 用 | `src/renderer/src/**/*`, `src/renderer/src/env.d.ts` | Preload の実装ファイルを含めない |

Renderer 側では Preload の「実装」には興味がなく、「公開された API の型」のみを解決できればよい。このため Renderer プロジェクトからは Preload の `.ts` を外し、`.d.ts` などの宣言ファイル経由で型だけを共有する。

## トラブルシューティング

- **症状:** Renderer で `window.api` が `unknown` になる / 型エラーが発生する
  → Renderer 用 `tsconfig` (`tsconfig.web.json`) の `include` に `src/preload/*.ts` が紛れ込んでいないか確認する。`.ts` を含めると対応する `.d.ts` が無視されるため、グローバル宣言が効かなくなる。
- **症状:** `Cannot write file ... because it would overwrite input file.`
  → 同じ `.d.ts` を複数の `tsconfig` から出力対象として扱っていないか確認する。Renderer 用では `.d.ts` を参照専用とし、バンドル対象には含めない。

## 参考リンク

- `src/preload/index.ts`
- `src/preload/api.d.ts`
- `src/renderer/src/env.d.ts`
- `tsconfig.node.json`, `tsconfig.web.json`
- `docs/notes/electron-context-isolation.md`
