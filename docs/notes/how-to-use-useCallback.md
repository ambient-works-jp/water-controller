# useCallback の使い方

## useCallback とは

`useCallback` は React の Hook の一つで、**関数の参照を保持（メモ化）する**ために使用します。

```typescript
const memoizedCallback = useCallback(
  () => {
    // 何か処理
  },
  [依存する値] // この配列内の値が変わった時だけ、新しい関数を作る
)
```

## なぜ必要なのか：JavaScript の関数の仕組み

### 基本的な問題

JavaScript では、**関数は毎回新しいオブジェクトとして作成されます**。

```typescript
function Component() {
  // この関数は、コンポーネントが再レンダリングされるたびに「新しい関数」として作られる
  const handleClick = () => {
    console.log('clicked')
  }

  return <button onClick={handleClick}>Click me</button>
}
```

毎回「新しい関数」が作られるということは：

```typescript
const func1 = () => console.log('hello')
const func2 = () => console.log('hello')

console.log(func1 === func2) // false！見た目は同じでも、別のオブジェクト
```

### これが問題になるケース

#### ケース1：カスタム Hook の依存配列

今回の問題がこれです。

```typescript
function App() {
  const [showSettings, setShowSettings] = useState(false)

  // ❌ 問題のあるコード
  const handleToggleSettings = () => {
    if (showSettings) {
      // 閉じる処理
    } else {
      // 開く処理
    }
  }

  // この useKeyboardShortcut は内部で useEffect を使っている
  useKeyboardShortcut([
    {
      key: 'm',
      handler: handleToggleSettings // ← 毎回「新しい関数」が渡される
    }
  ], []) // ← 空の依存配列 = 初回マウント時のみ実行
}
```

**何が起きているか：**

1. 初回レンダリング時：
   - `handleToggleSettings` という関数（A）が作られる
   - `useKeyboardShortcut` がその関数（A）を記憶する

2. 2回目以降のレンダリング時：
   - `handleToggleSettings` という**新しい**関数（B）が作られる
   - でも `useKeyboardShortcut` の依存配列が `[]` なので、useEffect は再実行されない
   - **古い関数（A）のまま使われ続ける** ← これが「stale closure（古いクロージャ）」問題

**結果：**

- 古い関数（A）は、初回レンダリング時の `showSettings` の値（false）しか知らない
- その後 `showSettings` が true になっても、関数（A）は古い値を参照し続ける

---

#### 🤔 よくある疑問：「新しい関数が作られるなら、最新の値を参照するのでは？」

**答え：その通りです！新しい関数（B）は確かに最新の `showSettings` を参照できます。**

**しかし、問題は「その新しい関数（B）が使われていない」ことです。**

##### useKeyboardShortcut の内部実装（想定）

```typescript
function useKeyboardShortcut(shortcuts, deps) {
  useEffect(() => {
    // ここで shortcuts[0].handler をイベントリスナーに登録する
    const handleKeyDown = (e) => {
      if (e.key === 'm' && e.metaKey) {
        shortcuts[0].handler() // ← この handler が実行される
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, deps) // ← deps が [] なので、初回マウント時のみ実行される
}
```

##### タイムラインで見る

**初回レンダリング（showSettings = false）:**

```txt
1. handleToggleSettings(A) が作られる（showSettings = false を参照）
2. useKeyboardShortcut が useEffect を実行
3. handleToggleSettings(A) がイベントリスナーに登録される ✅
```

**2回目のレンダリング（showSettings = true）:**

```txt
1. handleToggleSettings(B) が作られる（showSettings = true を参照）← 新しい！
2. useKeyboardShortcut は依存配列が [] なので useEffect を再実行しない
3. イベントリスナーには依然として handleToggleSettings(A) が登録されたまま ❌
```

**キーボードを押したとき:**

```txt
→ イベントリスナーに登録されている handleToggleSettings(A) が実行される
→ (A) は showSettings = false の時に作られた関数なので、false を参照する
```

##### 図解

```txt
App の再レンダリング
├─ 1回目（showSettings = false）
│  ├─ handleToggleSettings(A) 作成 ← showSettings = false を参照
│  └─ useKeyboardShortcut の useEffect 実行
│     └─ イベントリスナーに (A) を登録 ✅
│
├─ 2回目（showSettings = true）
│  ├─ handleToggleSettings(B) 作成 ← showSettings = true を参照
│  └─ useKeyboardShortcut の useEffect スキップ（deps = []）
│     └─ イベントリスナーは (A) のまま ❌
│
└─ キー押下
   └─ (A) が実行される ← showSettings = false を参照！
```

##### まとめ

- **新しい関数は確かに作られている**が、**useEffect が再実行されないので、古い関数が使われ続ける**
- これが「stale closure（古いクロージャ）」問題の本質
- React では関数が「作られる」ことと「使われる」ことは別の話

#### ケース2：子コンポーネントへの props

```typescript
function Parent() {
  const [count, setCount] = useState(0)

  // ❌ 問題：Parent が再レンダリングされるたびに新しい関数が作られる
  const handleClick = () => {
    console.log('clicked')
  }

  // Child は React.memo() でメモ化されているとする
  return (
    <div>
      <Child onClick={handleClick} />
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  )
}

const Child = React.memo(({ onClick }) => {
  console.log('Child rendered') // count が変わるたびに出力される
  return <button onClick={onClick}>Click me</button>
})
```

**問題点：**

- `count` が変わると Parent が再レンダリングされる
- `handleClick` が新しい関数として作られる
- `React.memo()` でメモ化された Child コンポーネントも、props が変わったと判断して再レンダリングされる
- `handleClick` の中身は同じなのに、無駄な再レンダリングが発生

## useCallback の使い方

### 基本的な使い方

```typescript
const memoizedCallback = useCallback(
  () => {
    // 何か処理
  },
  [] // 依存配列
)
```

- **第1引数**：メモ化したい関数
- **第2引数**：依存配列（この中の値が変わった時だけ、新しい関数を作る）

### 今回の修正例

```typescript
function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [isClosingSettings, setIsClosingSettings] = useState(false)

  // ✅ useCallback で関数をメモ化
  const handleToggleSettings = useCallback(() => {
    // setShowSettings の関数形式を使うことで、最新の state を取得
    setShowSettings((prev) => {
      if (prev) {
        // 閉じる処理
        setIsClosingSettings(true)
        setTimeout(() => {
          setShowSettings(false)
          setIsClosingSettings(false)
        }, 500)
        return prev
      } else {
        // 開く処理
        return true
      }
    })
  }, []) // 空の依存配列 = この関数は常に同じ参照を保つ

  // handleToggleSettings が変わった時だけ、useEffect を再実行
  useKeyboardShortcut([
    {
      key: 'm',
      handler: handleToggleSettings
    }
  ], [handleToggleSettings]) // ← handleToggleSettings を依存配列に追加
}
```

### 重要なテクニック：setState の関数形式

```typescript
// ❌ 古い書き方（クロージャ問題が起きる）
const handleClick = useCallback(() => {
  setCount(count + 1) // count は古い値を参照する可能性がある
}, [count]) // count を依存配列に入れる必要がある

// ✅ 推奨される書き方
const handleClick = useCallback(() => {
  setCount((prevCount) => prevCount + 1) // 常に最新の値を取得
}, []) // 依存配列が空でOK
```

**なぜ関数形式が良いのか：**

- `setState` の引数に関数を渡すと、React が**最新の state 値**を引数として渡してくれる
- クロージャで古い値を参照する問題を回避できる
- 依存配列を空にできる = 関数の参照が常に同じになる

## useCallback は本当に必要？3つの方法の比較

### 方法①: useCallback なし + deps に handler を含める

```typescript
const handleToggleSettings = () => {
  setShowSettings((prev) => !prev)
}

useKeyboardShortcut([
  {
    key: 'm',
    handler: handleToggleSettings
  }
], [handleToggleSettings]) // ← 毎回変わる
```

**動作**: ✅ 正しく動く

**問題点**:

- コンポーネントが再レンダリングされるたびに `handleToggleSettings` が新しく作られる
- 依存配列が変わるため、useEffect が毎回実行される
- イベントリスナーの削除・再登録が毎回発生する ← 無駄！

### 方法②: useCallback なし + deps が空 + 関数形式の setState

```typescript
const handleToggleSettings = () => {
  setShowSettings((prev) => !prev)
}

useKeyboardShortcut([
  {
    key: 'm',
    handler: handleToggleSettings
  }
], []) // ← 空の依存配列
```

**動作**: ✅ 正しく動く

**理由**:

- `setState((prev) => ...)` の関数形式は、React が**常に最新の state を prev として渡してくれる**
- 古い関数が実行されても、関数内で最新の値を取得できる

**条件**: 以下をすべて満たす場合のみ使える

- ✅ 関数内で state を直接参照しない（関数形式の setState のみ）
- ✅ 関数内で props を参照しない
- ✅ 関数内で他の state や変数を参照しない

### 方法③: useCallback あり + deps に handler + 関数形式の setState（推奨）

```typescript
const handleToggleSettings = useCallback(() => {
  setShowSettings((prev) => !prev)
}, [])

useKeyboardShortcut([
  {
    key: 'm',
    handler: handleToggleSettings
  }
], [handleToggleSettings]) // ← 常に同じ参照
```

**動作**: ✅ 正しく動く

**メリット**:

- 関数の参照が安定しているため、useEffect は初回のみ実行
- 無駄な再レンダリングや再登録を防げる
- コードの意図が明確（「この関数は変わらない」ことを明示）

### 比較表

| 方法 | 動作 | useEffect 実行頻度 | パフォーマンス | 推奨度 |
|------|------|-------------------|--------------|--------|
| ① useCallback なし + deps に handler | ✅ 動く | 毎回 | ❌ 悪い | △ |
| ② useCallback なし + deps 空 + 関数形式 setState | ✅ 動く | 初回のみ | ✅ 良い | ⭐️ |
| ③ useCallback あり + deps に handler + 関数形式 setState | ✅ 動く | 初回のみ | ✅ 良い | ⭐️⭐️ 最推奨 |

## まとめ

### useCallback の本質的な役割

1. **関数のメモ化によるパフォーマンス向上**
   - 毎回関数を生成しない
   - useEffect の無駄な実行を防ぐ
   - イベントリスナーの無駄な再登録を防ぐ

2. **コードの意図を明確にする**
   - 「この関数は変わらない」という意図を示せる
   - チームメンバーがコードを読んだ時に理解しやすい
   - ESLint の `exhaustive-deps` ルールに準拠

### 使い分けの基準

**必ず使うべき**:

- カスタム Hook の依存配列に渡す関数
- React.memo された子コンポーネントに渡す関数
- useEffect の依存配列に入れる関数

**使わなくて良い**:

- 通常のイベントハンドラ（パフォーマンス問題がない場合）
- 子コンポーネントがメモ化されていない場合

**重要**: useCallback は「動作するかどうか」ではなく、「パフォーマンスとコードの明確性」のために使う
