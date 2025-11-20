# useEffect 内での async/await ベストプラクティス

## `useEffect` のコールバック関数を `async` にしてはいけない

### ❌ NG: useEffect のコールバックを async にする

```typescript
useEffect(async () => {
  await someAsyncFunction()
}, [])
```

**なぜダメか:**

- `useEffect` は **クリーンアップ関数** または **`undefined`** を返すことを期待している
- `async` 関数は必ず **Promise** を返してしまう
- TypeScript/React が警告を出す

### ✅ OK: useEffect 内で async 関数を定義して呼び出す

```typescript
useEffect(() => {
  const saveDebugMode = async (): Promise<void> => {
    // async/await を使った処理
    const response = await window.api.ipc.saveConfig(updatedConfig)
    // ...
  }

  void saveDebugMode()  // Promise を無視することを明示
}, [debugMode, isInitialLoad])
```

## `void` の意味

`void saveDebugMode()` の `void` について：

- `saveDebugMode()` は `Promise<void>` を返す
- その Promise を **意図的に無視する** ことを `void` で明示している
- これにより「Promise の結果を待たないけど、それは意図的」ということをコードレビュアーや linter に伝えられる

**重要**: `void` は関数の終了を保証しない。`void` は単に「この Promise の結果を待たない」という意図を示すだけ。

```typescript
useEffect(() => {
  const saveDebugMode = async (): Promise<void> => {
    await window.api.ipc.saveConfig(updatedConfig)  // 1秒かかるとする
    console.log('saved!')
  }

  void saveDebugMode()
  console.log('useEffect finished')  // saveDebugMode の完了を待たずに即座に実行される
}, [debugMode])
```

実行順序：

1. `saveDebugMode()` が開始される（Promise が作成される）
2. `console.log('useEffect finished')` がすぐに実行される
3. useEffect のコールバック関数が終了する
4. （1秒後）`console.log('saved!')` が実行される

## 他の書き方（同じ意味）

```typescript
// 1. void を使う
void saveDebugMode()

// 2. then/catch で処理（エラーハンドリングが必要な場合）
saveDebugMode().catch(error => {
  console.error('Error:', error)
})

// 3. IIFE (Immediately Invoked Function Expression)
;(async () => {
  await saveDebugMode()
})()
```

## useEffect の実行順序と管理

### 誰が管理しているか？

**React の reconciler（調停器）** が管理している。

### useEffect の実行タイミング

```typescript
function App() {
  useEffect(() => {
    console.log('Effect 1')
  }, [dep1])

  useEffect(() => {
    console.log('Effect 2')
  }, [dep2])

  return <div>Hello</div>
}
```

実行順序：

1. **レンダリングフェーズ**: コンポーネント関数が実行され、仮想 DOM が構築される
2. **コミットフェーズ**: 実際の DOM に変更が反映される
3. **エフェクトフェーズ**: **すべての** useEffect が**上から順番に**実行される

**重要**:

- useEffect は**コンポーネント内で定義された順序で**同期的に実行される
- ただし、useEffect **内部**の非同期処理は並行して実行される

### 具体例で見る実行順序

```typescript
function App() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('1. Effect A start')
    const asyncTask = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('4. Effect A async done')
    }
    void asyncTask()
    console.log('2. Effect A end')
  }, [count])

  useEffect(() => {
    console.log('3. Effect B')
  }, [count])

  return <button onClick={() => setCount(count + 1)}>Click</button>
}
```

ボタンをクリックしたときの出力：

```txt
1. Effect A start
2. Effect A end       ← Effect A の useEffect コールバックは終了
3. Effect B           ← 次の useEffect が実行される
4. Effect A async done ← 1秒後に非同期処理が完了
```

## 問題になるケース

### 1. Race Condition（競合状態）

```typescript
useEffect(() => {
  const fetchData = async () => {
    const data = await api.fetchUser(userId)  // 2秒かかる
    setUser(data)
  }
  void fetchData()
}, [userId])
```

**問題シナリオ**:

1. `userId = 1` でリクエスト開始（2秒かかる）
2. 0.5秒後、ユーザーが `userId = 2` に変更
3. `userId = 2` でリクエスト開始（2秒かかる）
4. **userId=2 のレスポンスが先に返ってくる**（1.5秒後）→ state 更新
5. userId=1 のレスポンスが返ってくる（2秒後）→ **古いデータで上書き！**

### 2. クリーンアップされない非同期処理

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    await api.ping()
  }, 1000)

  // ❌ クリーンアップ関数がない！
}, [])
```

コンポーネントがアンマウントされても `setInterval` が動き続ける（メモリリーク）。

## 正しい対処法

### 1. クリーンアップ関数でキャンセル

```typescript
useEffect(() => {
  let cancelled = false

  const fetchData = async () => {
    const data = await api.fetchUser(userId)
    if (!cancelled) {  // キャンセルされていなければ state 更新
      setUser(data)
    }
  }
  void fetchData()

  return () => {
    cancelled = true  // クリーンアップ時にフラグを立てる
  }
}, [userId])
```

### 2. AbortController を使う

```typescript
useEffect(() => {
  const controller = new AbortController()

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/user/${userId}`, {
        signal: controller.signal
      })
      const data = await response.json()
      setUser(data)
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted')
      }
    }
  }
  void fetchData()

  return () => {
    controller.abort()  // リクエストをキャンセル
  }
}, [userId])
```

### 3. setInterval などのクリーンアップ

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    await api.ping()
  }, 1000)

  return () => {
    clearInterval(interval)  // ✅ クリーンアップ
  }
}, [])
```

## 現在のコードベースにおける安全性

water-controller-app の `App.tsx` での使用例：

```typescript
useEffect(() => {
  const saveDebugMode = async (): Promise<void> => {
    const response = await window.api.ipc.saveConfig(updatedConfig)
    // ...
  }
  void saveDebugMode()
}, [debugMode, isInitialLoad])
```

**このケースは比較的安全**:

- ファイル保存は冪等性がある（何度実行しても同じ結果）
- state を更新していない（race condition が起きない）
- クリーンアップが必要な処理（interval, subscription）がない

**ただし、厳密には**以下のような問題が起こる可能性はある：

```txt
1. debugMode を true に変更 → 保存開始（1秒かかる）
2. 0.5秒後、debugMode を false に変更 → 保存開始（1秒かかる）
3. どちらの保存が先に完了するかは不定
```

もし順序保証が必要なら、こうする：

```typescript
useEffect(() => {
  let cancelled = false

  const saveDebugMode = async (): Promise<void> => {
    const response = await window.api.ipc.saveConfig(updatedConfig)
    if (!cancelled && response.success) {
      console.log('[Config] Debug mode saved:', debugMode)
    }
  }
  void saveDebugMode()

  return () => {
    cancelled = true
  }
}, [debugMode, isInitialLoad])
```

## まとめ

1. **useEffect のコールバック関数を async にしない**
2. **useEffect 内で async 関数を定義して void で呼び出す**
3. **void は Promise を無視するだけで、終了を保証しない**
4. **Race Condition に注意**（特に state 更新を伴う場合）
5. **クリーンアップ関数で必ずリソースを解放する**
6. **AbortController や cancelled フラグでキャンセル処理を実装する**

## 参考リンク

- [React Beta Docs - Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React Beta Docs - You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [Overreacted - A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)
