# Pinia（轻量 Store）实现计划

本文是 mini-vue 内置「Pinia 风格」状态管理的设计稿与实现计划，会随实现推进同步更新。

## 目标

- 提供最小但现代的 Store 方案：`createPinia()` + `defineStore(id, setup)`（仅 setup store）。
- 仅在组件 `setup()` 内使用（避免引入额外的全局激活上下文，复用现有 `inject()` 语义）。
- 语义清晰、分层正确：插件安装走 `app.use()`，依赖注入走 `app.provide()`/`inject()`，响应式走 `src/reactivity/**`。
- 对重复 id 的 `defineStore` **直接报错**（同一 `id` 不允许定义为不同实现）。

## 非目标（保持简单）

- 不做 Pinia 完整能力：devtools、HMR store 热替换、SSR hydration、持久化、插件中间件、跨 setup 的 `getActivePinia()` 等。
- 不提供 map helpers（`mapState/mapActions`）或 Options API 兼容。
- 不支持在组件外调用 `useStore()`（当前 `inject()` 被设计为仅允许 setup 期调用）。

## 最终用户 API（草案）

### 1) 安装 pinia

```ts
import { createApp, createPinia } from '@/index.ts'
import App from '#/app.tsx'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
```

约束：

- `createPinia()` 返回对象插件，满足 `app.use()` 的要求：必须包含 `name/install/uninstall`。
- 同一 `app` 仅允许安装一个 `pinia`（依赖 `app.use()` 的 name 去重能力）。

### 2) 定义与使用 store（仅 setup store）

```ts
import { computed, defineStore, ref } from '@/index.ts'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  const inc = (): void => {
    count.value++
  }

  return { count, doubled, inc }
})
```

在组件中使用：

```ts
import type { SetupComponent } from '@/index.ts'
import { useCounterStore } from './stores/counter.ts'

export const Counter: SetupComponent = () => {
  const store = useCounterStore()

  return () => (
    <button onClick={() => store.inc()}>
      count: {store.count.value}, doubled: {store.doubled.value}
    </button>
  )
}
```

约束：

- `useCounterStore()` 只能在组件 `setup()` 执行窗口内调用；否则会因为底层 `inject()` 抛错（这是刻意限制以保持简单）。
- 若同一 `id` 被多次 `defineStore(id, setup)`，且 `setup` 引用不同（或签名不一致），直接抛错（见「错误语义」）。

### 3) 可选：`storeToRefs`

目标是提供一个轻量的解构辅助，避免直接解构导致丢失响应性（类似 Pinia 的 `storeToRefs`）。

```ts
import { storeToRefs } from '@/index.ts'

const store = useCounterStore()
const { count, doubled } = storeToRefs(store)
```

约束（保持简单）：

- 只对 store 上的 `ref/computed` 字段做透传/转换；action（函数）不处理。
- 不做深层转换或递归。

## 实现分层与目录建议

新增子域：`src/pinia/**`

- `src/pinia/index.ts`：pinia 子域唯一对外出口，导出 `createPinia/defineStore/storeToRefs` 与必要类型。
- `src/pinia/core/create-pinia.ts`：pinia 实例与插件实现（`name/install/uninstall`），持有 store registry 与 state root。
- `src/pinia/core/define-store.ts`：`defineStore` 工厂与 store 创建/复用逻辑。
- `src/pinia/core/injection.ts`：`piniaInjectionKey`（`InjectionKey<Pinia>`）。
- `src/messages/pinia.ts`：pinia 子域错误文案；并在 `src/messages/index.ts` re-export。

对外入口：

- `src/index.ts` 追加从 `@/pinia/index.ts` 的导出（值与类型按需）。

## 核心语义（实现要点）

### 1) pinia 与 app 的关系

- `createPinia()` 创建一个 pinia 实例，并以插件形式被安装到 `app`：
  - `install(app)`：`app.provide(piniaInjectionKey, pinia)`。
  - `uninstall(app)`：清理与该 app 关联的缓存（若实现需要）；保持与 router 插件一致的“可卸载”语义。

### 2) store 的创建与复用

- `defineStore(id, setup)` 返回 `useStore()`。
- `useStore()`：
  1. `inject(piniaInjectionKey)` 读取 pinia（仅 setup 期）。
  2. 若 pinia registry 中已存在该 `id` 的 store，直接返回（单例复用）。
  3. 若不存在，则执行 `setup()` 创建 store，并写入 registry。
- 重复定义策略：
  - 若 registry 中记录了该 `id` 对应的「定义信息」（例如 setup 函数引用），当再次 `defineStore` 同 id 但 setup 不同 → **直接抛错**。

### 3) 响应性边界

- store 本身不强行包一层 `reactive`：直接返回 `setup()` 的结果，让使用者用 `ref/reactive/computed` 明确声明响应性。
- 只提供轻量辅助（如 `storeToRefs`），不引入自动 unwrap 或 proxy 魔法，避免与 mini-vue 现有行为冲突。

## 错误语义（文案需落到 messages）

- `defineStore` 重复 id 且定义不一致：抛错（例如 `piniaDefineStoreDuplicateId`）。
- `useStore` 未安装 pinia：抛错（例如 `piniaNotInstalled`），提示「请在 createApp 后调用 app.use(createPinia())」。

备注：组件外调用 `useStore()` 的错误由 `inject()` 的既有报错覆盖；pinia 不额外兜底。

## 测试计划（不在本阶段执行）

新增 `test/pinia/**`，覆盖：

- 安装后 `useStore()` 可获取 store，且同一 app 内同 id 复用同一实例。
- 未安装 pinia 时 `useStore()` 抛出明确错误文案。
- `defineStore` 重复 id 且 setup 不同直接抛错。
- `storeToRefs` 对 `ref/computed` 字段行为正确（不处理函数）。

## 实施 checklist（文档阶段先占位）

- [x] 新增 `src/pinia/**` 子域（createPinia/defineStore/storeToRefs）
- [x] 补齐 `src/messages/pinia.ts` 并在 `src/messages/index.ts` 导出
- [x] 从 `src/index.ts` 暴露 pinia 对外 API
- [x] 补齐 `test/pinia/**` 核心用例
- [ ] 增加 `playground/` 示例用于手动验证
