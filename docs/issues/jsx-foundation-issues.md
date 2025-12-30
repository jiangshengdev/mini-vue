# JSX Foundation 模块问题记录

## 1. `createTextVirtualNode` 返回类型与 VirtualNode 接口定义不一致（已修复）

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

🟢 **已修复**

- 为 `VirtualNode` 增补可选 `text` 字段。
- `mountChild` 直接复用 `child.text`，移除类型断言。

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

## 3. 测试用例手动管理 `console.warn` mock（已优化）

- 位置：`test/jsx-runtime/jsx.test.tsx`
- 修复：统一通过 `spyOnConsole('warn')`（`test/test-utils/mocks.ts`）创建 spy，并依赖 `test/setup.ts` 的 `vi.restoreAllMocks()` 在 `afterEach` 自动恢复，不再手动 restore。
- 收益：降低 mock 泄漏导致的串扰风险，提升用例可读性与一致性。

## 4. 测试显式依赖内部实现细节（已优化）

- 位置：`test/jsx-runtime/h.test.ts`
- 现状：测试用例曾显式断言 `expect(virtualNode.key).toBeUndefined()`，属于对 `h` 内部默认值处理的实现细节依赖。
- 影响：虽然目前行为正确，但这过度依赖了 `h` 函数如何处理 `undefined` props 的内部实现。
- 提示：测试应关注外部行为（如 `key` 是否起作用），尽量减少对非公开属性状态的直接断言。
- 状态：🟢 **已优化**（移除默认值断言，新增通过 `render`/DOM 复用与移动验证 `key` 语义的黑盒用例）

## 5. 组件类型被限定为 `(props: never)`，导致 ElementType 无法接受正常组件（待修复）

- 位置：`src/jsx-foundation/types.ts`
- 现状：`ComponentLike` 定义为 `(props: never) => RenderFunction`，`ElementType` 因此只接受该签名，正常的函数组件或 `SetupComponent<P>` 都会在 TSX 中报类型错误，`h`/`jsx` 无法与组件联动。
- 影响：组件类型在类型层面完全不可用，外部使用 TSX 传入组件会直接类型报错，阻断基础用法。
- 可能方案：
  - 将 `ComponentLike` 改为与 `SetupComponent` 对齐的签名（如 `<P = PropsShape>(props: PropsWithChildren<P>) => RenderFunction`），或直接复用 `SetupComponent`。
  - 调整 `ElementType`/`ElementProps` 推导链，确保组件 props 能按实际签名推导，配合 `jsx-shim`/顶层导出同步更新。
