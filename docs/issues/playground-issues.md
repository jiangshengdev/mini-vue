# Playground 模块问题记录

## 本轮审查补充

- 本轮 playground 代码审查新增 4 条问题，来源见 `docs/reviews/playground/*.md`（views-lis-visualization、tests）。

## 1. 输入变更后自动播放仍绑定过期导航器（Major）

- 位置：`playground/views/lis-visualization/index.tsx:91`（`resetNavigator` 仅重建 trace/navigator；`createPlaybackController` 在初始化时捕获旧 navigator）。
- 现象：修改输入数组后重新创建 navigator，但播放控制器仍引用旧实例，自动播放会沿用过期步骤，可能与最新输入脱节或越界。
- 提示：在输入变更时同步重建/更新播放控制器依赖的 navigator，或让控制器持有可变导航引用。

## 2. 空输入兜底分支不可达（Minor）

- 位置：`playground/views/lis-visualization/index.tsx:176`（空状态判断使用 `trace.steps.length === 0`）。
- 现象：`trace` 始终包含初始化步骤，清空输入后仍渲染完整界面，空状态提示永远不显示。
- 提示：改为基于输入长度或结果步骤判定空状态，例如 `state.input.get().length === 0`。

## 3. 可视化编排层缺少集成测试覆盖（Major）

- 位置：`playground/views/lis-visualization/__tests__`（缺少 `index.tsx` 编排层场景）。
- 现象：已有测试集中在控制器/工具层，未覆盖输入变更、导航重建与播放控制器联动等跨层交互，像问题 1 未被测试捕获。
- 提示：补充 `index.tsx` 集成用例，涵盖输入变化、步骤导航、自动播放、hover 刷新等主路径。

## 4. 路由与入口缺少回归测试（Minor）

- 位置：`playground/__tests__` 缺少针对 `playground/router/index.ts`、`playground/app.tsx`、`playground/main.ts` 及基础视图的用例。
- 现象：导航路径、页面渲染与入口挂载依赖人工验证，路由变更或入口回归缺少自动化保障。
- 提示：添加路由配置与入口渲染的烟雾/回归测试，至少覆盖关键路径和 404 分支。
