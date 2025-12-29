# Plan

重写锚点逻辑对齐 Vue3：组件透传子树首尾注释，空渲染用单注释占位，插入锚点可靠回退，确保隐藏→重排→再显示顺序稳定且无重复注释；注释文案按 Vue3 语义自定义，优先 DOM，无需考虑 SSR。

## Scope

- In: 组件/Fragment 锚点创建与同步、空渲染注释占位、插入锚点回退策略、相关测试与 Playground anchor 验证。
- Out: SSR/hydration、样式/UI、与锚点无关的功能。

## Action items

[ ] 梳理 Vue3 锚点语义与现状差异，明确组件 `vnode.el/anchor` 透传与占位注释文本（自定义但符号语义）。
[ ] 设计组件锚点数据流：实例 `start/endAnchor`、`latestHostAnchor`、`mountedHandle.nodes` 的同步与空渲染单注释占位规则。
[ ] 实现挂载路径：需要锚时创建首尾注释，子树挂 fragment 后按 endAnchor 插入；空渲染生成/复用占位注释并写回引用。
[ ] 实现 patch 路径：插入锚点优先当前 endAnchor，缺失回退父锚；子树 handle 包裹锚点；移动后刷新实例锚引用。
[ ] 加固占位复用：复用前校验 anchor 是否在容器，失效回退末尾/父锚，避免重复注释与 “anchor not found”。
[ ] 更新锚点获取与移动：`findNextAnchor` 读取同步后的 handle 首节点作为稳定锚，确保注释随子树移动。
[ ] 补齐测试与验证：修复 anchor 回归、unkeyed/keyed diff、mount-handle 空渲染；手动验证 playground anchor；运行相关 Vitest 与 `pnpm tsc --noEmit`。

## Decisions

- 占位注释文案：使用自定义但符合 Vue3 语义的注释文本，禁止空字符串。
- 锚点策略：按 Vue3 官方优先使用当前 endAnchor/片段锚，`latestHostAnchor` 仅作回退。
- 宿主范围：只考虑 DOM 渲染，无需适配其他宿主或 SSR。

## Findings / Known issues

- 隐藏→重排→再显示时占位锚点曾落到尾部，导致顺序错乱；空渲染复用旧锚未校验导致 `anchor not found` 异常；注释重复累积。
- 当前失败用例（待修）：`test/runtime-core/component/anchor-regression.test.tsx` 中隐藏后重排再显示顺序不对、空渲染移动不应复活旧子节点。

## Validation plan

- 目标测试：相关 Vitest 套件（anchor-regression、unkeyed/keyed diff、mount-handle）、`pnpm tsc --noEmit`。
- Playground 手动：`playground/views/anchor` 反复隐藏/显示、打乱顺序，观察注释锚包裹与顺序稳定性。
