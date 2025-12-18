# runtime-core Patch 类型优化 — Requirements

## 背景

`src/runtime-core/patch` 已具备完整的 diff/patch 能力，但类型侧仍存在大量强制断言与上下文不对齐，难以及时暴露接口误用或未归一化的 children。需要通过类型收紧与 helper 提升静态安全性与可维护性。

## 用户故事（User Stories）

### US-1：Patch 入口拒绝非 vnode children

作为框架维护者，
我希望 patch 相关 API 在类型层就限定输入为归一化 vnode，
以便在编译阶段阻断 string/boolean 等未处理分支。

**验收标准（EARS）**

- WHEN 调用 `patchChild`/`patchChildren`
  THE SYSTEM SHALL 仅接受已归一化的 vnode 类型（不再允许 `VirtualNodeChild` 中的原始文本）。
- WHEN 调用方传入未归一化 children
  THE TYPE SYSTEM SHALL 报错或要求显式转换。

### US-2：Text/Fragment/Element 分派具备完备属性类型

作为框架维护者，
我希望在 patch 分支中能直接获取特定 vnode 形态的属性（如 Text 的 text 字段、Fragment 的 anchor），
以减少强转并避免属性缺失。

**验收标准（EARS）**

- WHEN 进入 Text/Fragment/Element/Component 分支
  THE TYPE SYSTEM SHALL 提供对应属性的确定类型，无需 `(VirtualNode & { text?: string })`。
- WHEN 新增分支或属性缺失
  THE TYPE SYSTEM SHALL 在编译阶段提示，避免静默漏处理。

### US-3：上下文传递无 `as never`

作为框架维护者，
我希望 patch/mount 之间的上下文互转是类型安全的，
以避免父组件/appContext 在泛型上退化为 unknown。

**验收标准（EARS）**

- WHEN 调用 `normalizeMountContext`/`normalizeChildContext`
  THE SYSTEM SHALL 不再依赖 `as never`，并保持 parent/appContext 的泛型信息。
- WHEN 添加新的上下文字段
  THE TYPE SYSTEM SHALL 能通过基础接口同步到 mount/patch 两侧。

### US-4：运行时元数据读取安全

作为框架维护者，
我希望在读取 runtime vnode 的 handle/el/anchor 时具备显式存在性信息，
以减少 move/unmount 路径的潜在空值错误。

**验收标准（EARS）**

- WHEN 从 runtime vnode 获取 handle/anchor/nodes
  THE TYPE SYSTEM SHALL 提供相应的存在性约束或 require 守卫。
- WHEN handle 缺失或 nodes 为空
  THE SYSTEM SHALL 在类型或 helper 层指导调用方进行判空处理。

## 约束（Constraints）

- 仅修改 `src/runtime-core/patch/**` 以及支撑其类型对齐的最小必要共享类型；不改动对外公共 API。
- 不引入运行时行为变化；类型调整需确保编译通过且现有测试语义不变。
- 避免新增广义 `any`/`unknown`/`as`；若必须使用断言需在代码注释中说明原因。

## 非目标（Non-goals）

- 不重构 patch 算法或调度逻辑。
- 不更改 JSX foundation 的对外类型契约（除非为建模 TextVNode 必要且行为不变）。
- 不引入新的依赖或构建/打包流程调整。
