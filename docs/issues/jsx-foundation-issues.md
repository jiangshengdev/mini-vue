# JSX Foundation 模块问题记录

## 1. `createTextVirtualNode` 返回类型与 VirtualNode 接口定义不一致（待修复）

### 问题描述

`src/jsx-foundation/factory.ts` 中的 `createTextVirtualNode` 函数返回的对象包含 `text` 属性：

```typescript
export function createTextVirtualNode(content: string | number): VirtualNode<typeof Text> & {
  text: string
} {
  return {
    // ...
    text: String(content),
  }
}
```

然而，核心接口 `VirtualNode` (`src/jsx-foundation/types.ts`) 中并没有定义 `text` 属性。

这导致在 `src/runtime-core/mount/child.ts` 等运行时代码中，无法直接访问 `child.text`，必须使用类型断言 `(child as VirtualNode<typeof Text> & { text?: string })`，这增加了维护成本并降低了类型安全性。

### 影响范围

- `src/jsx-foundation/types.ts`
- `src/jsx-foundation/factory.ts`
- `src/runtime-core/mount/child.ts`

### 建议修复方案

在 `VirtualNode` 接口中添加可选的 `text` 属性：

```typescript
export interface VirtualNode<T extends ElementType = ElementType> {
  // ... 其他属性
  readonly key?: PropertyKey
  /** 文本节点专属的内容字段，普通元素/组件为空 */
  readonly text?: string
}
```

实施此修改后，可以移除运行时代码中的相关类型断言。

### 状态

🔴 **待修复**

代码已回退，目前代码库中仍存在此类型不一致问题。

---

## 2. `ComponentChildren` 不接受 `null` 导致类型/运行时不一致（待修复）

- 位置：`src/jsx-foundation/types.ts`（`ComponentChildren`、`RenderOutput`）
- 现状：类型仅允许 `boolean | undefined` 表示空值，显式的 `null` 被排除；但运行时的 `normalizeChildren` / `normalizeRenderOutput` 会把 `null` 视为可忽略节点并正常处理。
- 影响：
  - 常见写法如组件 `return null` 或传入 `children: null` 会在 TS 层报错，实际运行时却是合法输入，类型与行为分叉。
  - 使用 React/Vue 心智的用户容易踩坑，需要额外类型断言或绕过检查，降低易用性。
- 可能方案：
  - 直接将 `null` 纳入 `ComponentChildren`/`RenderOutput` 联合类型（如 `VirtualNodeChild | VirtualNodeChild[] | boolean | null | undefined`），与运行时处理保持一致。
  - 若 lint 规则限制显式 `null`，可通过别名封装（如 `type NullableChild = VirtualNodeChild | null`）或调整规则配置，仅对类型声明放宽，以避免在调用方层面出现类型报错。

## 3. 测试用例手动管理 `console.warn` mock（待优化）

- 位置：`test/jsx-runtime/jsx.test.tsx`
- 现状：测试用例 '忽略对象与函数等不可渲染的 children' 中手动管理 `console.warn` 的 mock 和 restore。
- 影响：若在 `try` 块之外发生错误，可能导致 `console.warn` 未被 restore，污染导致其他测试失败或噪音。
- 提示：建议使用 `vi.mocked` 或 `afterEach` 全局清理机制来管理 mock 状态。

## 4. 测试显式依赖内部实现细节（待优化）

- 位置：`test/jsx-runtime/h.test.ts`
- 现状：测试用例 '支持省略 props 直接传入可变 children' 显式断言 `expect(virtualNode.key).toBeUndefined()`。
- 影响：虽然目前行为正确，但这过度依赖了 `h` 函数如何处理 `undefined` props 的内部实现。
- 提示：测试应关注外部行为（如 `key` 是否起作用），尽量减少对非公开属性状态的直接断言。
