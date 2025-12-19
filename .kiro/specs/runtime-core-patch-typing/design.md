# runtime-core Patch 类型优化 — Design

## 0. 基线审计输出

- 强转热点
  - `src/runtime-core/patch/children.ts`：17 处 `as VirtualNode`，原因是 children 仍声明为 `VirtualNodeChild[]`（包含原始文本），实际运行时已被 `normalizeRenderOutput` 转成 vnode。`findNextAnchor` 也需断言 vnode 形态以读取 handle.nodes。
  - `src/runtime-core/patch/child.ts`：Text 分支使用 `(VirtualNode<typeof Text> & { text?: string })` 读取 text；组件分支调用 `resolveComponentProps(next as never)`，体现 vnode 形态与 props 解析期望的脱节。
  - `src/runtime-core/patch/context.ts`：`normalizeMountContext`/`normalizeChildContext` 以 `as never` 传递 appContext，PatchContext/MountContext 父实例泛型不对齐。
- 类型不变量与风险点
  - 渲染入口 `normalizeRenderOutput` 会将 render 输出与 vnode.children 中的原始文本统一转为 Text vnode；数组输出包裹为 Fragment，并递归归一化子项。因此 patch 阶段的 children 逻辑上已经是 vnode 数组（无字符串/数字/布尔）。
  - mount 路径 `mountChild` 仍接受 `RenderOutput`，但 patch 调用的 children 均来源于已 normalize 的 vnode；收紧 patch 输入不会破坏 mount 的宽松能力。
  - Fragment/组件/元素在 mount 后都会写入 `handle` 与 `el`，patch 读写 runtime 元数据时可假定对应宿主引用已存在（但需保留防御性判空）。
  - PatchContext/MountContext 都包含 parent/appContext，现存差异仅在泛型命名上，可通过共享基类消除 `as never`。

## 1. 背景与问题

- `patchChild`/`patchChildren` 接口仍使用 `VirtualNodeChild[]`，运行时虽已归一化为 vnode，但类型侧无法阻止原始文本/布尔值透传，导致大量 `as VirtualNode`。
- Text vnode 的 `text` 字段未被类型建模，当前通过 `(VirtualNode & { text?: string })` 读取，缺乏类型收敛与分发后的安全性。
- PatchContext 与 MountContext 使用不同父实例/appContext 类型，通过 `as never` 互转，增加上下文链路的类型洞。
- `asRuntimeVNode` 返回宽泛结构，调用处无法表达 handle/anchor/el 的存在性，导致 move/teardown 相关路径重复强转。
- 宿主泛型与环境类型在 child/children/utils 内重复展开，`ContainerLike`/环境对象形态分散，增加后续演进成本。

## 2. 目标

- 明确 patch 流程的类型不变量：输入 children 已归一化为 vnode；Text/Fragment/Element/Component 在类型层可区分。
- 减少 `as`/`unknown`/`any`，优先通过类型别名、类型守卫与上下文统一来表达约束。
- 保持现有泛型约束（HostNode/HostElement/HostFragment 与 renderer options 对齐），不牺牲对宿主的可配置性。
- 在不改运行时行为的前提下提升类型可读性与 IDE 推断质量，降低未来改动的回归风险。

## 3. 范围与约束

- 覆盖 `src/runtime-core/patch/**`，以及为消除类型洞必须调整的共享类型（如 `vnode.ts`、`mount/context.ts`）。不触碰渲染器对外 API。
- 不引入任何运行时逻辑变更；现有测试语义保持一致。
- 保持 JSX foundation 类型不破坏对外契约，必要时通过 patch 侧类型别名/守卫隔离。

## 4. 方案

### 4.1 子节点输入收敛

- 定义 patch 侧的「已归一化子节点」类型（仅 vnode），并用于 `patchChild`/`patchChildren` 签名。
- 确认入口（如 mount/normalizeChildren）保证 children 为 vnode[]；如存在文本透传，补充类型守卫或转换以匹配真实行为。
- 提供公共别名（如 `PatchableChildren`），避免调用方再接受 `VirtualNodeChild` 的宽泛输入。

### 4.2 节点形态建模

- 为 Text/Fragment/Element/Component 引入具名 vnode 结构（如 `TextVNode` 带必选 `text` 字段），让分派后的分支具备完备属性类型。
- 增加轻量 type guard/helper（`isTextVNode` 等）替代 `(VirtualNode & { text?: string })` 的直接断言。

### 4.3 运行时元数据 typing

- 为 `asRuntimeVNode` 增加具名返回类型或子类型化 helper（区分是否存在 `handle`/`el`），减少重复的 runtime 强转。
- 在 move/unmount/anchor 相关路径封装读取逻辑，使 `handle.nodes`/`anchor`/`component` 的存在性在类型上可见。

### 4.4 上下文/环境收敛

- 通过 shared base 对齐 PatchContext 与 MountContext，移除 `as never`，确保 `parent/appContext` 类型闭合。
- 提取统一的 `PatchEnvironment<HostTypes>`（含 container/anchor/context/patchChild），在 child.ts/children.ts 复用，减少泛型展开。
- 视需要调整 `ContainerLike` 定义，使其与 renderer options 的 insert/remove 签名一致且易于推断。

### 4.5 keyed diff 辅助结构类型化

- 将 `IndexRange`/`KeyedPatchState`/`IndexMaps` 等结构改为收紧的只读或具名字段类型，明确哨兵值与索引边界含义。
- 在 keyed diff 流程中使用更精确的节点类型别名，减少 `as VirtualNode` 的数量。

## 5. 风险与兼容性

- 收紧签名可能暴露尚未显式 normalize 的调用点，需在入口补充转换或更新测试期望。
- TextVNode 建模可能涉及 JSX foundation 的文本创建路径，需确保 runtime 数据形态不变。
- 对 PatchContext/MountContext 的对齐需验证组件实例泛型与 renderer options 上下游约束，避免泛型回退到 `unknown`。

## 6. 验证与度量

- 类型：`pnpm typecheck` 通过，新类型用例覆盖 patchChild/patchChildren 的主要分支（Text/Element/Fragment/Component/keyed/unkeyed）。
- 行为：不修改运行时逻辑，可抽样跑 `pnpm test --filter runtime-core` 验证无误改。
- 代码卫生：新增/遗留的 `as VirtualNode`、`as never` 数量显著减少，类型别名与 helper 命名统一、可读。
