# 水コントローラーの仕様

## ファームウェアのシリアル通信のフォーマット

### シリアル通信のフォーマット

文字列カンマ区切り

```txt
button,frontLow,frontHigh,rightLow,rightHigh,backLow,backHigh,leftLow,leftHigh
```

### データ形式

- `button`
  - データ型: int
  - データの取りうる値
    - 0: ボタン押下なし
    - 1: ボタン押下あり
- `frontXxx` ~ `leftXxx`
  - データ型: int
  - データの取りうる値
    - 0: 接触なし
    - 1: 接触あり

### 変換後

- `button` -> `isButtonPushed`
  - データ型: bool
  - データの取りうる値
    - `false`: ボタン押下なし
    - `true`: ボタン押下あり
- `frontXxx` ~ `leftXxx` -> `front`, `right`, `back`, `left`
  - データ型: enum
  - データの取りうる値
    - `NOINPUT`: 入力なし
    - `LOW`: 入力あり
    - `HIGH`: 入力あり
  - データ変換例 `left`
    - `NOINPUT`
      - 入力
        - `leftLow`: 0
        - `leftHigh`: 0
      - 出力
        - `left`: `NOINPUT`
    - `LOW`
      - 入力
        - `leftLow`: 1
        - `leftHigh`: 0
      - 出力
        - `left`: `LOW`
    - `HIGH`
      - 入力
        - `leftLow`: 1
        - `leftHigh`: 1
      - 出力
        - `left`: `HIGH`
