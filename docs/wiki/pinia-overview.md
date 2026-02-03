# Pinia（最小实现）概览

mini-vue 内置了一个「Pinia 风格」的轻量状态管理实现，目标是把**插件安装 + 依赖注入 + 响应式**三条链路串起来，方便在学习运行时时有一个可复用的 store 形态。

## 能力与限制

- 仅支持现代形式（setup store）：`defineStore(id, () => ({ ... }))`
- 仅允许在组件 `setup()` 执行窗口内使用 `useStore()`（因为底层依赖 `inject()`）
- 同一 store `id` 的不同定义会直接报错（避免静默复用导致的隐性错误）
- 提供 `storeToRefs(store)`：只提取 `ref/computed` 字段用于解构（action 会被忽略）

## 基本用法

### 1) 安装 pinia

```ts
import { createApp, createPinia } from '@/index.ts'
import type { SetupComponent } from '@/index.ts'

const App: SetupComponent = () => {
  return () => {
    return <div>hello</div>
  }
}

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

### 2) 定义 store（setup store）

```ts
import { computed, defineStore, ref } from '@/index.ts'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  const inc = (): void => {
    count.value += 1
  }

  return { count, doubled, inc }
})
```

### 3) 在组件中使用 + storeToRefs 解构

```tsx
import { storeToRefs, type SetupComponent } from '@/index.ts'
import { useCounterStore } from './stores/counter.ts'

export const Counter: SetupComponent = () => {
  const store = useCounterStore()
  const { count, doubled } = storeToRefs(store)

  return () => {
    return (
      <button type="button" onClick={() => store.inc()}>
        count: {count.value}, doubled: {doubled.value}
      </button>
    )
  }
}
```

## 常见错误

- 未安装 pinia 就调用 `useStore()`：
  - 报错：`pinia: 未找到 pinia...`
  - 解决：确保在 `createApp` 后 `app.use(createPinia())`
- 重复定义同一 `id` 的不同 store：
  - 报错：`pinia.defineStore: 已存在同 id 的不同 store 定义...`
  - 解决：修改 `id` 或移除重复定义

