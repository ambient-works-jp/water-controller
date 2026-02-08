# Scripts

## convert-video.sh

動画ファイルを Web 用の MP4 形式（H.264）に変換するスクリプト。

### 使い方

#### 基本

```bash
./scripts/convert-video.sh <input.mov>
```

#### 出力ファイル名を指定

```bash
./scripts/convert-video.sh input.mov output.mp4
```

#### オプション付き

```bash
# 高品質、1080p
./scripts/convert-video.sh input.mov -q high -r 1080p

# 低品質（軽量）、480p
./scripts/convert-video.sh input.mov -q low -r 480p
```

### オプション

| オプション | 値 | 説明 |
|-----------|---|------|
| `-q, --quality` | `high`/`medium`/`low` | 品質設定（デフォルト: `medium`） |
| `-r, --resolution` | `1080p`/`720p`/`480p` | 解像度（デフォルト: `720p`） |

### 品質設定の詳細

| 品質 | CRF | Preset | ファイルサイズ | 用途 |
|-----|-----|--------|--------------|------|
| `high` | 23 | medium | 大 | 高画質重視 |
| `medium` | 28 | fast | 中 | バランス型（推奨） |
| `low` | 32 | veryfast | 小 | パフォーマンス重視 |

### 例

```bash
# プロジェクトの背景動画を変換（デフォルト設定）
./scripts/convert-video.sh src/renderer/src/assets/background-movie.mov

# 低品質で軽量な動画を生成（ラズパイ向け）
./scripts/convert-video.sh src/renderer/src/assets/background-movie.mov \
  -q low -r 480p

# 高品質でフルHD
./scripts/convert-video.sh src/renderer/src/assets/background-movie.mov \
  -q high -r 1080p
```

### 出力形式

- **コーデック**: H.264 (libx264)
- **音声**: なし（`-an` で削除）
- **形式**: MP4
- **ループ再生**: 対応
- **ブラウザ互換性**: 高い

### 必要なツール

- `ffmpeg` がインストールされている必要があります

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# ラズベリーパイ
sudo apt install ffmpeg
```
