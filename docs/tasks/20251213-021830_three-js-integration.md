# タスク: Three.js の導入

**作成日時**: 2025-12-13 02:18:30 (JST)
**ステータス**: 🚧 進行中

## ゴール

水槽コンテンツに Three.js を使った 3D グラフィックスを導入できるようにする。

## 背景・動機

現在のコンテンツは Canvas 2D API のみで実装されているが、より表現力の高い 3D グラフィックスを使いたい。Three.js を導入することで、以下が可能になる：

- 3D パーティクルシステム
- カメラワークを活用した演出
- ライティング・シェーダーを使った高度な表現
- WebGL を使った高パフォーマンスなレンダリング

## 参考資料

- [Electron + React + Three.js の環境構築](https://yasuhirohoshino.com/posts/20230427_electron_react_threejs)
- [Three.js 公式ドキュメント](https://threejs.org/docs/)
- [@react-three/fiber 公式ドキュメント](https://docs.pmnd.rs/react-three/getting-started/introduction)

## タスク一覧

### 1. Three.js 関連パッケージのインストール

- [ ] `three` パッケージのインストール
- [ ] `@react-three/fiber` のインストール（React と Three.js の統合）
- [ ] `@react-three/drei` のインストール（便利なヘルパーコンポーネント）
- [ ] `@types/three` のインストール（TypeScript 型定義）

### 2. サンプルコンテンツの作成

- [ ] Three.js を使った基本的な 3D コンテンツを作成
- [ ] Canvas 2D と同じインターフェースで動作することを確認

### 3. 動作確認

- [ ] アプリを起動してサンプルコンテンツが表示されることを確認
- [ ] ボタン入力でコンテンツ切り替えができることを確認
- [ ] ビルドが正常に完了することを確認

### 4. ドキュメント更新

- [ ] PLAYLIST.md に Three.js を使ったコンテンツの追加方法を記載
- [ ] タスクドキュメントを完了状態に更新

## 技術的な詳細

### Three.js とは

Three.js は WebGL を扱いやすくするための JavaScript 3D ライブラリ。以下の特徴がある：

- **シーン管理**: 3D オブジェクト、カメラ、ライトを階層的に管理
- **レンダラー**: WebGL を抽象化し、ブラウザ間の差異を吸収
- **豊富なジオメトリ**: 球体、立方体、カスタムメッシュなど
- **マテリアル**: 質感、色、反射などの表現
- **アニメーション**: フレームごとの更新とトゥイーン

### @react-three/fiber とは

Three.js を React コンポーネントとして扱えるようにするライブラリ：

- JSX で 3D シーンを記述できる
- React の状態管理やライフサイクルを活用
- 宣言的な API で直感的に書ける

### @react-three/drei とは

@react-three/fiber の便利なヘルパーコンポーネント集：

- OrbitControls: マウスでカメラ操作
- Environment: 環境マッピング
- Text3D: 3D テキスト
- など多数のユーティリティ

## 実装方針

### コンテンツの構造

```typescript
// content4-three-example.tsx
import { Canvas } from '@react-three/fiber'
import type { Content } from '../types'

export const threeExample: Content = {
  metadata: {
    id: 'three-example',
    name: 'Three.js Example',
    description: 'Three.js を使った 3D サンプル'
  },
  render: (ctx, t, vw, vh) => {
    // Canvas 2D は使わず、React コンポーネントとして実装する方法を検討
    // または Canvas 要素内に WebGL コンテキストを作成する
  }
}
```

### 統合方法の検討

現在のコンテンツは `render: (ctx, t, vw, vh) => void` という Canvas 2D API を前提とした関数型。Three.js を使う場合、以下の選択肢がある：

1. **Canvas 2D と併用**: Canvas 要素に WebGL コンテキストを作成し、Three.js レンダラーを紐付ける
2. **React コンポーネント化**: Content 型を拡張し、React コンポーネントも受け付けるようにする

## 制約・注意事項

- 既存の Canvas 2D コンテンツとの互換性を保つ
- パフォーマンスに影響を与えないよう注意
- ビルドサイズの増加に留意

## 完了条件

- [ ] Three.js を使った 3D コンテンツが動作する
- [ ] ボタン入力でコンテンツ切り替えができる
- [ ] ビルドが正常に完了する
- [ ] ドキュメントが更新されている

## メモ・その他

（作業中に気づいたことをメモ）
