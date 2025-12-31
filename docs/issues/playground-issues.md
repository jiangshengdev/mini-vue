# Playground 模块问题记录

## 本轮审查补充

- 本轮 playground 代码审查新增 4 条问题，来源见 `docs/reviews/playground/*.md`（views-lis-visualization、tests）。

## 1. 输入变更后自动播放仍绑定过期导航器（级别：Major；状态：已解决）

- 位置：`playground/views/lis-visualization/index.tsx:91`（`resetNavigator` 仅重建 trace/navigator；`createPlaybackController` 在初始化时捕获旧 navigator）。
- 现象：修改输入数组后重新创建 navigator，但播放控制器仍引用旧实例，自动播放会沿用过期步骤，可能与最新输入脱节或越界。
- 处理：已让播放控制器通过 `getNavigator` 拿到最新实例，并在输入变化后保持自动播放与新导航器对齐（`playground/views/lis-visualization/index.tsx`、`controllers/playback-controller.ts`、`__tests__/playback-controller.test.ts`）。

## 2. 空输入兜底分支不可达（级别：Minor；状态：已解决）

- 位置：`playground/views/lis-visualization/index.tsx:176`（空状态判断使用 `trace.steps.length === 0`）。
- 现象：`trace` 始终包含初始化步骤，清空输入后仍渲染完整界面，空状态提示永远不显示。
- 处理：空态判定改为基于 `state.input.get().length`，空输入时渲染简化界面。

## 3. 可视化编排层缺少集成测试覆盖（级别：Major；状态：已解决）

- 位置：`playground/views/lis-visualization/__tests__`（缺少 `index.tsx` 编排层场景）。
- 现象：已有测试集中在控制器/工具层，未覆盖输入变更、导航重建与播放控制器联动等跨层交互，像问题 1 未被测试捕获。
- 处理：新增编排层集成用例覆盖输入变化、导航/自动播放和 hover 刷新（`playground/views/lis-visualization/__tests__/index.integration.test.tsx`）。

## 4. 路由与入口缺少回归测试（级别：Minor；状态：已解决）

- 位置：`playground/__tests__` 缺少针对 `playground/router/index.ts`、`playground/app.tsx`、`playground/main.ts` 及基础视图的用例。
- 现象：导航路径、页面渲染与入口挂载依赖人工验证，路由变更或入口回归缺少自动化保障。
- 处理：补充路由匹配、App+Router 渲染及入口挂载的回归测试（`playground/__tests__/router-entry.test.tsx`）。
