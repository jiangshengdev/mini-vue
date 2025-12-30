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

## 5. 组件类型被限定为 `(props: never)`，导致 ElementType 无法接受正常组件（已修复）

- 位置：
  - `src/jsx-foundation/types.ts`（`ComponentLike`、`ElementType`、`ElementProps` 推导链）
  - `src/jsx-shim.d.ts`（`JSX.ElementType` 绑定到 `ElementType`）
  - （可选）`src/runtime-core/component/mount.ts`（`as never` 类型断言）
- 现状：`ComponentLike` 定义为 `(props: never) => RenderFunction`，用作组件类型的“上界”。
  - 好处：在 `strictFunctionTypes` 下，`never` 参数位能“接住”几乎所有 `(props: P) => RenderFunction` 的组件实现。
  - 问题：一旦组件被“擦除”为 `ElementType`/`ComponentLike`，其 `props` 会在类型层坍缩为 `never`，导致：
    - `const X: ElementType = Foo` 之后，`<X msg="..."/>` 这类写法在 TSX 中无法通过（因为 `X` 的 props 被视为 `never`）。
    - `const Foo: ElementType = (props) => ...` 这类声明会触发“上下文类型化”，使 `props` 在组件实现内部直接被推成 `never`，进一步放大可用性问题。
- 根因（核心是 TS 的函数参数变型 + 缺少存在类型）：
  - 在 `strictFunctionTypes` 下，函数参数是逆变检查；想表达“任意 props 的组件集合”本质需要 `∃P. SetupComponent<P>` 这类存在类型，但 TS 无法直接表达。
  - 用 `(props: never)` 作为上界属于“技巧性绕路”，能扩大可赋值集合，但会把被擦除后的 props 信息完全抹掉。
- 目标：
  - 具体组件（`SetupComponent<P>` 或显式 `(props: P) => RenderFunction`）在 TSX 下仍能正确推导 `P` 并得到 props 提示。
  - 动态/擦除组件（如 `ElementType` 容器）在 TSX 下至少不应“拒绝所有 props”；允许降级为宽松校验，而不是推成 `never`。
  - 避免引入 `any`（保持项目“禁用 any”的设计取向）。
- 方案落地（类型层，已实现）：
  - `src/jsx-foundation/types.ts`
    - `ComponentLike` 使用 bivariance hack 替代 `(props: never)`，让窄 `props` 的 `SetupComponent<P>` 可赋值到 `ElementType` 上界。
    - `InferComponentProps<T>` 在 `infer Props = unknown` 时回退到 `PropsWithChildren<PropsShape>`，避免擦除后 `props` 推导丢失可用形态。
  - `src/jsx-shim.d.ts`
    - 增补 `JSX.LibraryManagedAttributes<C, P>`：当 `C extends ElementType`（非 intrinsic）时，将 TSX props 校验统一映射到 `ElementProps<C>` 推导链，避免“擦除后 props = never”。
  - `test/jsx-foundation/element-type.types.test.tsx`
    - 增加类型回归：覆盖 `const X: ElementType = Foo; <X msg="..." />` 与 `h(type: ElementType, props)` 的可用性。
- 推荐方案（类型层）：引入“可接住任意组件，但 props 退化为宽松”的 `AnySetupComponent`，替代 `(props: never)`。
  - 做法要点：使用 React typings 常用的 **bivariance hack** 构造一个“参数位双向”的组件上界，使 `SetupComponent<P>` 可赋值给它，同时它自身不会把 `props` 推成 `never`。
  - 预期效果：
    - 具体组件：仍通过 `T extends SetupComponent<infer P>` 分支精确推导 `ElementProps<T>`。
    - 擦除组件：`ElementProps<AnySetupComponent>` 回退到 `PropsShape`（或 `PropsWithChildren<PropsShape>`），保证 TSX 不会直接拒绝一切 props。
  - 参考伪代码（仅表达思路，最终以 `types.ts` 现有工具类型为准）：

    ```ts
    type AnySetupComponent = {
      bivarianceHack(props: PropsShape & { children?: ComponentChildren }): RenderFunction
    }['bivarianceHack']

    type ComponentLike = AnySetupComponent

    type InferComponentProps<T> =
      T extends SetupComponent<infer P>
        ? P & { children?: ComponentChildren }
        : T extends AnySetupComponent
          ? PropsShape & { children?: ComponentChildren }
          : PropsShape
    ```

- 可选方案（运行时类型断言收敛）：
  - `runtime-core` 里的 `instance as never` / `runtime as never` 多半是为了绕开“运行时 vnode ↔ instance 双向引用 + 泛型递归”导致的类型不匹配/类型爆炸。
  - 可考虑：
    - 让 `RuntimeVirtualNode` 参数化 `T extends SetupComponent` 并让 `asRuntimeVirtualNode()` 保留 `T`，从而让 `runtime.component` 与 `instance.virtualNode` 在类型层自然对齐，减少断言。
    - 或引入 `UnknownRuntimeVirtualNode` / 复用 `UnknownComponentInstance`，刻意断开泛型链，避免类型系统深度递归。
- 回归用例建议（类型用例优先，避免仅靠运行时测试）：
  - 精确 props：`const Foo: SetupComponent<{ msg: string }>` 时，`<Foo msg="x" />` 通过且有提示。
  - 擦除降级：`const X: ElementType = Foo` 时，`<X msg="x" />` 允许（提示可降级为宽松），但不应报 “props 为 never”。
  - `h()` 同步覆盖：`h(Foo, { msg: 'x' })` 精确；`h(X, { msg: 'x' })` 宽松但可用。
