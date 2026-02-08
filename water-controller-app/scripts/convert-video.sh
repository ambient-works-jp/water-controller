#!/bin/bash

# 動画変換スクリプト (.mov → .mp4)
# パフォーマンス重視でH.264形式に変換

set -e

# 使い方を表示
if [ $# -eq 0 ]; then
  echo "使い方: ./convert-video.sh <input.mov> [output.mp4]"
  echo ""
  echo "例:"
  echo "  ./convert-video.sh ../src/renderer/src/assets/background-movie.mov"
  echo "  ./convert-video.sh input.mov output.mp4"
  echo ""
  echo "オプション:"
  echo "  -q, --quality   品質設定 (high/medium/low, デフォルト: medium)"
  echo "  -r, --resolution 解像度 (1920x1080/1280x720/854x480, デフォルト: 1280x720)"
  echo ""
  exit 1
fi

# デフォルト設定
INPUT_FILE="$1"
OUTPUT_FILE="${2:-${INPUT_FILE%.*}-720p.mp4}"
QUALITY="medium"
RESOLUTION="1280:720"

# パラメータ解析
while [[ $# -gt 0 ]]; do
  case $1 in
    -q|--quality)
      QUALITY="$2"
      shift 2
      ;;
    -r|--resolution)
      case $2 in
        1920x1080|1080p)
          RESOLUTION="1920:1080"
          ;;
        1280x720|720p)
          RESOLUTION="1280:720"
          ;;
        854x480|480p)
          RESOLUTION="854:480"
          ;;
        *)
          echo "エラー: 不正な解像度: $2"
          exit 1
          ;;
      esac
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# 品質設定
case $QUALITY in
  high)
    CRF=23
    PRESET="medium"
    ;;
  medium)
    CRF=28
    PRESET="fast"
    ;;
  low)
    CRF=32
    PRESET="veryfast"
    ;;
  *)
    echo "エラー: 不正な品質設定: $QUALITY"
    exit 1
    ;;
esac

# 入力ファイルの確認
if [ ! -f "$INPUT_FILE" ]; then
  echo "エラー: 入力ファイルが見つかりません: $INPUT_FILE"
  exit 1
fi

echo "=========================================="
echo "動画変換を開始します"
echo "=========================================="
echo "入力ファイル: $INPUT_FILE"
echo "出力ファイル: $OUTPUT_FILE"
echo "品質: $QUALITY (CRF=$CRF, PRESET=$PRESET)"
echo "解像度: $RESOLUTION"
echo "=========================================="

# ffmpeg で変換
ffmpeg -i "$INPUT_FILE" \
  -vcodec h264 \
  -crf "$CRF" \
  -preset "$PRESET" \
  -vf "scale=$RESOLUTION" \
  -an \
  "$OUTPUT_FILE"

echo ""
echo "=========================================="
echo "変換完了: $OUTPUT_FILE"
echo "=========================================="

# ファイルサイズを表示
if command -v du &> /dev/null; then
  INPUT_SIZE=$(du -h "$INPUT_FILE" | cut -f1)
  OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
  echo "入力サイズ: $INPUT_SIZE"
  echo "出力サイズ: $OUTPUT_SIZE"
fi
