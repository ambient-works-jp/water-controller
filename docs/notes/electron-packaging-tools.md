# Electron のパッケージングツール：electron-builder と Electron Forge

## 概要

このドキュメントでは、Electron アプリを配布可能な形式にパッケージングするための2つの主要なツール、`electron-builder` と `Electron Forge` について説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [Electron 開発ガイドライン](../electron-development-guidelines.md)

---

## 2つのツールの概要

どちらも **Electron アプリを各プラットフォーム向けの配布可能な形式にパッケージング**するためのツールですが、アプローチと機能範囲が異なります。

---

## electron-builder

### 役割

Electron アプリを各プラットフォーム向けの**インストーラーやパッケージに変換**するビルドツール。

### 特徴

- ✅ **シンプルな設定**：YAML ファイルで設定を記述
- ✅ **多様な配布形式**：dmg、pkg、exe、AppImage、deb、snap など
- ✅ **コード署名とノータライゼーション**：macOS/Windows の署名に対応
- ✅ **自動更新機能**：`electron-updater` との統合
- ✅ **軽量**：ビルドツールとしての機能に特化
- ✅ **既存プロジェクトへの追加が容易**

### 公式ドキュメント

- [electron-builder 公式サイト](https://www.electron.build/)
- [GitHub リポジトリ](https://github.com/electron-userland/electron-builder)

---

## Electron Forge

### 役割

Electron アプリの**開発からビルド、配布まで**を一貫してサポートするフルスタックフレームワーク。

### 特徴

- ✅ **フルスタックツール**：プロジェクト作成から配布まで全て対応
- ✅ **プラグインシステム**：Webpack、Vite、Parcel などのバンドラーと統合
- ✅ **テンプレート**：TypeScript、React、Vue などのテンプレート提供
- ✅ **公開機能**：GitHub Releases、S3 などへの自動公開
- ✅ **開発サーバー内蔵**：独自の開発環境を提供
- ⚠️ **やや重い**：全機能を含むため、学習コストが高い

### 公式ドキュメント

- [Electron Forge 公式サイト](https://www.electronforge.io/)
- [GitHub リポジトリ](https://github.com/electron/forge)

---

## 2つのツールの比較

| 項目 | electron-builder | Electron Forge |
|------|-----------------|----------------|
| **役割** | ビルド・パッケージングに特化 | フルスタックフレームワーク |
| **設定ファイル** | YAML（`electron-builder.yml`） | JavaScript/TypeScript（`forge.config.js`） |
| **開発サーバー** | 含まない（別途必要） | 含む（統合） |
| **バンドラー** | 任意（Vite、Webpack など） | プラグインで選択 |
| **学習コスト** | 低い | やや高い |
| **柔軟性** | 高い（既存プロジェクトに追加しやすい） | 中（Forge のエコシステムに従う） |
| **配布形式** | 豊富（dmg、pkg、exe、AppImage など） | 豊富（同等） |
| **コード署名** | ✅ 対応 | ✅ 対応 |
| **自動更新** | ✅ electron-updater と統合 | ✅ 組み込み |
| **プロジェクト構造** | 自由 | Forge の構造に従う |
| **プロジェクト作成** | 手動 | CLI でテンプレートから作成 |

---

## water-controller-app での使用

### このプロジェクトでは electron-builder を使用

**package.json での定義**:

```json
{
  "devDependencies": {
    "electron-builder": "^25.1.8",
    "electron-vite": "^4.0.1"
  },
  "dependencies": {
    "electron-updater": "^6.3.9"
  },
  "scripts": {
    "dev": "electron-vite dev",
    "build": "npm run typecheck && electron-vite build",
    "build:mac": "electron-vite build && electron-builder --mac",
    "build:win": "npm run build && electron-builder --win",
    "build:linux": "electron-vite build && electron-builder --linux",
    "build:unpack": "npm run build && electron-builder --dir"
  }
}
```

### 設定ファイル

**electron-builder.yml**:

```yaml
appId: com.AmbientWork.WaterController
productName: WaterController

directories:
  buildResources: build

files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'

# macOS 向け設定
mac:
  entitlementsInherit: build/entitlements.mac.plist
  notarize: false

# macOS dmg ファイル
dmg:
  artifactName: ${productName}-${version}.${ext}

# Windows 向け設定
win:
  executableName: ${productName}

# Windows インストーラー（NSIS）
nsis:
  artifactName: ${productName}-${version}-setup.${ext}
  shortcutName: ${productName}
  createDesktopShortcut: always

# Linux 向け設定
linux:
  target:
    - AppImage
    - snap
    - deb
  maintainer: electronjs.org
  category: Utility

# 自動更新
publish:
  provider: generic
  url: https://example.com/auto-updates
```

---

## 開発フロー

### water-controller-app での構成

```txt
electron-vite（開発・ビルド）+ electron-builder（パッケージング）
```

#### 1. 開発

```bash
pnpm dev
```

**動作**:

- electron-vite で開発サーバー起動
- Hot Module Replacement（HMR）でリアルタイム更新
- TypeScript のトランスパイル
- Vite による高速ビルド

#### 2. ビルド

```bash
pnpm run build
```

**動作**:

- TypeScript の型チェック
- electron-vite で本番用にビルド
- `out/` ディレクトリに成果物を出力

```txt
out/
├── main/
│   └── index.js           # Main プロセス
├── preload/
│   └── index.js           # Preload スクリプト
└── renderer/
    ├── index.html
    └── assets/
        └── index.js       # Renderer プロセス
```

#### 3. パッケージング

```bash
# macOS 向け（.app と .dmg を生成）
pnpm run build:mac

# 署名をスキップして高速ビルド（開発用）
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:mac

# Windows 向け（.exe インストーラーを生成）
pnpm run build:win

# Linux 向け（AppImage、snap、deb を生成）
pnpm run build:linux

# パッケージングのみ（インストーラーなし、動作確認用）
pnpm run build:unpack
```

**動作**:

- electron-builder が `out/` の内容をパッケージング
- 各プラットフォーム向けのインストーラーを生成
- `dist/` ディレクトリに成果物を出力

```txt
dist/
├── mac/
│   └── WaterController.app        # macOS アプリバンドル
├── WaterController-0.1.0.dmg      # macOS インストーラー
├── win-unpacked/
│   └── WaterController.exe        # Windows 実行ファイル
├── WaterController-0.1.0-setup.exe # Windows インストーラー
└── WaterController-0.1.0.AppImage  # Linux AppImage
```

---

## なぜ electron-builder を選んだか

### 1. 既存プロジェクトへの追加が容易

このプロジェクトでは **electron-vite** を使って開発環境を構築しているため、ビルドツールとしての `electron-builder` を追加するだけで済みます。

```txt
開発: electron-vite（Vite ベースの高速ビルド）
　　　　　　↓
配布: electron-builder（パッケージング）
```

Electron Forge を使う場合、開発環境全体を Forge のエコシステムに合わせる必要があり、既存の electron-vite との統合が複雑になります。

### 2. シンプルな設定

YAML ファイルで設定を記述するため、直感的で読みやすい：

```yaml
# electron-builder.yml
appId: com.AmbientWork.WaterController
productName: WaterController

mac:
  notarize: false

dmg:
  artifactName: ${productName}-${version}.${ext}
```

Electron Forge では JavaScript/TypeScript で設定を記述する必要があり、やや複雑です。

### 3. 軽量

パッケージングに特化しているため、余計な依存関係がありません。

---

## ファイル構成

### water-controller-app のディレクトリ構造

```txt
water-controller-app/
├── src/                           # ソースコード
│   ├── main/                      # Main プロセス
│   │   └── index.ts
│   ├── preload/                   # Preload スクリプト
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/                  # Renderer プロセス
│       └── src/
│           ├── App.tsx
│           └── env.d.ts
├── out/                           # ビルド成果物（electron-vite）
│   ├── main/
│   │   └── index.js
│   ├── preload/
│   │   └── index.js
│   └── renderer/
│       ├── index.html
│       └── assets/
├── dist/                          # パッケージング成果物（electron-builder）
│   ├── mac/
│   │   └── WaterController.app
│   ├── win-unpacked/
│   └── *.dmg, *.exe, *.AppImage
├── build/                         # ビルドリソース
│   └── entitlements.mac.plist
├── resources/                     # 静的リソース
│   └── icon.png
├── package.json                   # npm スクリプト、依存関係
├── electron-builder.yml           # パッケージング設定
└── electron.vite.config.ts        # 開発環境設定
```

---

## 選択基準

### プロジェクトの状況に応じた推奨ツール

| プロジェクトの状況 | 推奨ツール |
|----------------|----------|
| **既存プロジェクトにパッケージング機能を追加** | electron-builder |
| **新規プロジェクトをゼロから作成** | Electron Forge または electron-builder |
| **Vite や Webpack など既存のバンドラーを使用** | electron-builder |
| **Electron のエコシステムに完全に統合したい** | Electron Forge |
| **シンプルな設定で軽量に保ちたい** | electron-builder |
| **プロジェクト作成から配布までワンストップで管理** | Electron Forge |

---

## electron-builder の詳細

### 対応する配布形式

| プラットフォーム | 形式 | 説明 |
|--------------|------|------|
| **macOS** | `.app` | アプリケーションバンドル |
| | `.dmg` | ディスクイメージ（インストーラー） |
| | `.pkg` | macOS パッケージインストーラー |
| | `.zip` | ZIP アーカイブ |
| **Windows** | `.exe` | NSIS インストーラー |
| | `.msi` | Windows Installer（MSI） |
| | `.appx` | Windows Store パッケージ |
| | `portable` | ポータブル実行ファイル |
| **Linux** | `.AppImage` | ポータブルアプリケーション |
| | `.snap` | Snap パッケージ |
| | `.deb` | Debian パッケージ |
| | `.rpm` | Red Hat パッケージ |
| | `.tar.gz` | tar アーカイブ |

### コード署名

#### macOS

```yaml
# electron-builder.yml
mac:
  # 開発証明書で署名
  identity: "Developer ID Application: Your Name (TEAM_ID)"

  # ノータライゼーション（公証）
  notarize: true

# 環境変数で設定
# APPLE_ID: Apple ID
# APPLE_ID_PASSWORD: アプリ専用パスワード
# APPLE_TEAM_ID: チーム ID
```

#### Windows

```yaml
# electron-builder.yml
win:
  # コード署名証明書
  certificateFile: "path/to/certificate.pfx"
  certificatePassword: "${env.WINDOWS_CERT_PASSWORD}"
```

### 自動更新

`electron-updater` を使用して、アプリの自動更新機能を実装できます。

```typescript
// src/main/index.ts
import { app, autoUpdater } from 'electron'
import { autoUpdater } from 'electron-updater'

app.on('ready', () => {
  // 更新チェック
  autoUpdater.checkForUpdatesAndNotify()

  // 更新が見つかったときの処理
  autoUpdater.on('update-available', () => {
    console.log('Update available')
  })

  // ダウンロード完了時の処理
  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded')
    autoUpdater.quitAndInstall()
  })
})
```

```yaml
# electron-builder.yml
publish:
  provider: github
  owner: your-org
  repo: your-repo
```

---

## Electron Forge の詳細

### プロジェクト作成

```bash
# Vite + TypeScript テンプレート
npm init electron-app@latest my-app -- --template=vite-typescript

# Webpack + TypeScript テンプレート
npm init electron-app@latest my-app -- --template=webpack-typescript
```

### 設定ファイル（forge.config.js）

```javascript
module.exports = {
  packagerConfig: {
    name: 'WaterController',
    appBundleId: 'com.AmbientWork.WaterController',
    icon: './assets/icon'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'WaterController'
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // Vite の設定
        build: [
          {
            entry: 'src/main.ts',
            config: 'vite.main.config.ts'
          }
        ]
      }
    }
  ]
}
```

---

## まとめ

### electron-builder（water-controller-app で使用中）

**役割**: Electron アプリを各プラットフォーム向けにパッケージング

**特徴**:

- ✅ シンプルな設定（YAML）
- ✅ 軽量（ビルドツールに特化）
- ✅ 既存プロジェクトに追加しやすい
- ✅ 多様な配布形式に対応

**使い方**:

1. `electron-builder.yml` で設定
2. `pnpm run build:mac` などでビルド
3. `dist/` ディレクトリに成果物が生成される

### Electron Forge（water-controller-app では未使用）

**役割**: Electron アプリの開発からビルド、配布までをサポートするフレームワーク

**特徴**:

- ✅ フルスタック（開発環境も含む）
- ✅ プラグインシステム
- ✅ テンプレート提供
- ⚠️ やや重い

**使い方**:

1. `npm init electron-app@latest` でプロジェクト作成
2. `forge.config.js` で設定
3. `npm run make` でビルド

### water-controller-app の構成

```txt
electron-vite（開発・ビルド）+ electron-builder（パッケージング）
```

**理由**:

- ✅ electron-vite で高速な開発体験
- ✅ electron-builder でシンプルなパッケージング
- ✅ 軽量で柔軟な構成
- ✅ 既存の設定を活かせる

---

## 参考資料

### electron-builder

- **[公式サイト](https://www.electron.build/)**
  - 設定オプション、ビルド方法、コード署名など
- **[GitHub リポジトリ](https://github.com/electron-userland/electron-builder)**
- **[Configuration（設定リファレンス）](https://www.electron.build/configuration/configuration)**
  - YAML 設定の詳細
- **[Code Signing（コード署名）](https://www.electron.build/code-signing)**
  - macOS と Windows のコード署名方法

### Electron Forge

- **[公式サイト](https://www.electronforge.io/)**
  - Getting Started、設定、プラグインなど
- **[GitHub リポジトリ](https://github.com/electron/forge)**
- **[Templates（テンプレート）](https://www.electronforge.io/templates)**
  - Vite、Webpack、TypeScript などのテンプレート
- **[Plugins（プラグイン）](https://www.electronforge.io/config/plugins)**
  - 利用可能なプラグイン一覧

### electron-updater

- **[公式ドキュメント](https://www.electron.build/auto-update)**
  - 自動更新の実装方法
- **[GitHub リポジトリ](https://github.com/electron-userland/electron-builder/tree/master/packages/electron-updater)**

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [Electron 開発ガイドライン](../electron-development-guidelines.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)
- [contextIsolation（コンテキスト分離）](./electron-context-isolation.md)

### プロジェクト内の関連ファイル

- `water-controller-app/package.json` - npm スクリプト、依存関係
- `water-controller-app/electron-builder.yml` - パッケージング設定
- `water-controller-app/electron.vite.config.ts` - 開発環境設定
