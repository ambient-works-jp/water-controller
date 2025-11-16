# Config ベースのコンテンツ管理システムへの移行

このドキュメントは、コンテンツ管理を config.json ベースに移行するタスクの概要を記述します。

## ステータス

- 最終更新日時：2025-11-17 00:47:00
- 作成日時：2025-11-17 00:33:18
- ステータス：進行中

## 目的

- プレイリストの永続化を実現する
- ユーザーが config.json を編集してコンテンツの再生順序を変更できるようにする
- コード側（CONTENTS）を正として、config.json に同期する仕組みを構築する
- コンテンツ一覧とプレイリストを分離して管理できるようにする

## ゴール

以下の状態が実現されていること：

- [ ] Config 型に `contents` と `playlist` フィールドが追加されている
- [ ] アプリ起動時に CONTENTS が config.contents に自動的に書き込まれる
- [ ] config.playlist から実際の再生順序が決定される
- [ ] 設定画面で「コンテンツ一覧」と「プレイリスト」が正しく表示される
- [ ] config.json を手動編集してプレイリストを変更できる
- [ ] 既存のコンテンツ切り替え機能が正常に動作する

## 背景

### 現在の実装

- `CONTENTS`: コード側で定義された全コンテンツ（`src/renderer/src/components/Contents/index.tsx`）
- `PLAYLIST`: コード側で定義されたプレイリスト（`src/renderer/src/components/Contents/playlist.ts`）
- Config には `wsUrl` と `debugMode` のみ

### 問題点

- プレイリストがコードに埋め込まれており、変更するにはコードを修正する必要がある
- ユーザーが再生順序をカスタマイズできない
- 運用上、展示会などでプレイリストを変更したい場合に柔軟性がない

### 新しい設計

```typescript
type ContentId = string

export type ContentItem = {
  id: ContentId
  name: string
  description: string
}

export type Config = {
  wsUrl: string
  debugMode: boolean
  contents: ContentItem[]      // 利用可能な全コンテンツ
  playlist: ContentId[]        // 再生順序（ContentId のリスト）
}
```

**データフロー:**

1. **CONTENTS の定義（コード側）**: `src/renderer/src/components/Contents/index.tsx` に `ContentItem[]` として定数定義
2. **初回起動時の初期化**:
   - `CONTENTS` → `config.contents`（上書き）
   - `CONTENTS.map(c => c.id)` → `config.playlist`（デフォルト値）
   - `config.json` に保存
3. **2回目以降の起動**:
   - `CONTENTS` → `config.contents`（常に上書き、コード側が正）
   - `config.playlist` はそのまま保持（ユーザーのカスタマイズを維持）
4. **プレイリスト変更方法**:
   - 現在: `config.json` を手動編集
   - 将来: 設定画面から GUI で変更可能に
5. **設定画面表示**:
   - 「コンテンツ一覧」タブ: `config.contents` を表示
   - 「プレイリスト」タブ: `config.playlist` に基づいて順序表示

## タスク一覧

- [ ] 1. Config 型定義の更新
  - [ ] `ContentItem` 型を定義（`id`, `name`, `description`）
  - [ ] `Config` 型に `contents` と `playlist` フィールドを追加

- [ ] 2. CONTENTS の定義変更
  - [ ] `src/renderer/src/components/Contents/index.tsx` で `CONTENTS` を `ContentItem[]` として定義
  - [ ] 既存の `Content[]`（描画関数付き）との紐付けを維持

- [ ] 3. config.ts の更新（重要：初回起動時の初期化）
  - [ ] `loadConfig` に初回起動時の初期化処理を追加
    - [ ] config.json が存在しない場合の処理
    - [ ] `CONTENTS` → `config.contents` への同期
    - [ ] `CONTENTS.map(c => c.id)` → `config.playlist` のデフォルト設定
  - [ ] `loadConfig` に2回目以降の起動処理を追加
    - [ ] `CONTENTS` → `config.contents` の上書き（常に実行）
    - [ ] `config.playlist` の保持（ユーザーカスタマイズを維持）
  - [ ] バリデーションの更新

- [ ] 4. config/config.default.json の削除
  - [ ] デフォルト値が動的になったため不要

- [ ] 5. プレイリスト生成ロジックの実装
  - [ ] `config.playlist` から実際の `Content[]` を生成する関数を実装
  - [ ] `playlist.ts` を config ベースに変更
  - [ ] 存在しない ContentId のエラーハンドリング

- [ ] 6. 設定画面（SettingsTab）の更新
  - [ ] `config.contents` を「コンテンツ一覧」タブに表示
  - [ ] `config.playlist` を「プレイリスト」タブに表示
  - [ ] description フィールドも表示

- [ ] 7. コンテンツ再生ロジックの更新
  - [ ] `Contents/index.tsx` で config ベースのプレイリストを使用
  - [ ] ボタン押下でのコンテンツ切り替えが正常に動作することを確認

- [ ] 8. DebugOverlay への現在再生中コンテンツ情報の追加
  - [ ] Contents コンポーネントに `onContentChange` コールバックを追加
  - [ ] 現在のコンテンツ情報（name, index, total）を親コンポーネントに通知
  - [ ] DebugOverlay に props を追加（currentContentName, currentContentIndex, totalContents）
  - [ ] DebugOverlay の表示を更新：`Content: {name} ({index + 1}/{total})`

- [ ] 9. テストと動作確認
  - [ ] 初回起動時の config.json 生成を確認
  - [ ] 2回目以降の起動で playlist が保持されることを確認
  - [ ] config.json を手動編集してプレイリストを変更できることを確認
  - [ ] コンテンツ切り替えが正常に動作することを確認
  - [ ] 設定画面の表示が正しいことを確認
  - [ ] DebugOverlay にコンテンツ情報が正しく表示されることを確認

- [ ] 10. 設定ファイル編集 UI の実装（優先度：低）
  - [x] `react-shiki` パッケージをインストール（既にインストール済み）
  - [ ] ConfigEditorModal コンポーネントを作成
  - [ ] SettingsTab に「設定ファイルを編集」ボタンを追加
  - [ ] モーダル内でシンタックスハイライト付きエディタを表示
  - [ ] 保存処理を実装（IPC 経由で config.json を更新）
  - [ ] 保存後に設定を再読み込み
  - [ ] バリデーションエラーの表示
  - [ ] キャンセル時の確認ダイアログ（変更がある場合）

## 技術的な実装詳細

### 1. 起動時の同期処理（重要）

**場所**: `src/main/config.ts` の `loadConfig` 関数

**初回起動時（config.json が存在しない）**:

```typescript
1. DEFAULT_CONFIG を作成
2. CONTENTS を読み込む（renderer プロセスから取得する必要あり）
3. DEFAULT_CONFIG.contents = CONTENTS
4. DEFAULT_CONFIG.playlist = CONTENTS.map(c => c.id)
5. config.json に保存
6. config を返す
```

**2回目以降の起動**:

```typescript
1. config.json を読み込む
2. CONTENTS を読み込む
3. config.contents = CONTENTS（常に上書き、コード側が正）
4. config.playlist はそのまま保持（ユーザーカスタマイズを維持）
5. 変更があれば config.json に保存
6. config を返す
```

**注意点**:

- CONTENTS はコード側（renderer プロセス）で定義されているため、main プロセスから取得する必要がある
- IPC 経由で CONTENTS を取得するか、共通モジュールとして定義する

### 2. プレイリスト生成

**場所**: `src/renderer/src/components/Contents/playlist.ts`

**処理フロー**:

```typescript
1. config.playlist から ContentId[] を取得
2. 各 ContentId に対応する Content を CONTENTS から検索
3. 見つかった Content[] を返す
4. 見つからない ContentId はスキップしてログに警告
```

### 3. CONTENTS の定義方法

**新しい設計**: CONTENTS を `ContentItem[]` として定義

```typescript
// src/renderer/src/components/Contents/index.tsx

// ContentId の定数定義（typo 防止）
export const CONTENT_IDS = {
  CIRCULAR_PARTICLES: 'circular-particles',
  WAVE_LINES: 'wave-lines',
  RADIAL_SPOKES: 'radial-spokes'
} as const

// ContentItem のリスト（定数として定義）
export const CONTENTS: ContentItem[] = [
  {
    id: CONTENT_IDS.CIRCULAR_PARTICLES,
    name: 'Circular Particles',
    description: '円周上を回転しながら移動するパーティクルのアニメーション'
  },
  {
    id: CONTENT_IDS.WAVE_LINES,
    name: 'Wave Lines',
    description: '複数の波線が重なり合うアニメーション'
  },
  {
    id: CONTENT_IDS.RADIAL_SPOKES,
    name: 'Radial Spokes',
    description: '中心から放射状に伸びるスポークのアニメーション'
  }
]

// Content（描画関数付き）は別途定義
const allContents: Record<string, Content> = {
  [CONTENT_IDS.CIRCULAR_PARTICLES]: circularParticles,
  [CONTENT_IDS.WAVE_LINES]: waveLines,
  [CONTENT_IDS.RADIAL_SPOKES]: radialSpokes
}

// ContentId から Content を取得する関数
export function getContentById(id: string): Content | undefined {
  return allContents[id]
}
```

**ポイント**:

- `CONTENT_IDS` で ContentId を定数定義（typo 防止）
- CONTENTS に追加しないとコンテンツは登録されない
- ContentItem（メタデータ）と Content（描画関数）を分離
- `getContentById` で ContentId から Content を取得
- `as const` で型安全性を確保

### 4. 設定ファイル編集 UI（タスク 10）

**UI イメージ**:

```txt
┌────────────────────────────────────────────────────────┐
│  設定ファイルを編集                              × 閉じる │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 1  {                                             │ │
│  │ 2    "wsUrl": "ws://127.0.0.1:8080/ws",          │ │
│  │ 3    "debugMode": false,                         │ │
│  │ 4    "contents": [                               │ │
│  │ 5      {                                         │ │
│  │ 6        "id": "circular-particles",             │ │
│  │ 7        "name": "Circular Particles",           │ │
│  │ 8        "description": "円周上を回転..."        │ │
│  │ 9      },                                        │ │
│  │ 10     ...                                       │ │
│  │ 11   ],                                          │ │
│  │ 12   "playlist": [                               │ │
│  │ 13     "circular-particles",                     │ │
│  │ 14     "wave-lines",                             │ │
│  │ 15     "radial-spokes"                           │ │
│  │ 16   ]                                           │ │
│  │ 17 }                                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ⚠ 注意: playlist を変更してコンテンツの再生順序を     │
│    カスタマイズできます                                │
│                                                        │
├────────────────────────────────────────────────────────┤
│                       [キャンセル]  [保存してリロード]  │
└────────────────────────────────────────────────────────┘
```

**実装のポイント**:

- `react-shiki` で JSON のシンタックスハイライトを適用
- `textarea` または専用エディタコンポーネントで編集
- 保存時に JSON.parse() でバリデーション
- バリデーションエラーは赤文字で表示
- 保存成功後、自動的に設定を再読み込み
- 変更がある状態で閉じる場合、確認ダイアログを表示

## 参考資料

- 既存の Config 実装: `src/main/config.ts`
- CONTENTS 定義: `src/renderer/src/components/Contents/index.tsx`
- PLAYLIST 定義: `src/renderer/src/components/Contents/playlist.ts`
- 設定画面: `src/renderer/src/components/SettingsPanel/SettingsTab.tsx`
- タスクテンプレート: `docs/tasks/yyyymmdd-hhmmss_task-summary.md`
- **daisyUI LLM 向けドキュメント**: https://daisyui.com/llms.txt （UI スタイリングに使用）

## 注意事項

- 既存のコンテンツ切り替え機能を壊さないように注意
- config.json の後方互換性を考慮（古い設定ファイルでも動作するように）
- エラーハンドリングを適切に行う（不正な ContentId、存在しないコンテンツなど）
- アプリ起動時の同期処理が重くならないように注意
