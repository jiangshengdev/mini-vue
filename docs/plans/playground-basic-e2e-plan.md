# 计划：playground basic 的 E2E 回归（Playwright）

为 `playground/views/basic` 下的基础示例补齐 Playwright E2E 用例，覆盖路由进入、交互与 DOM 更新；默认仅跑 `chromium` 加快反馈，并在必要时通过少量 `data-testid` 提升选择器稳定性。

## 已确认的约束

- 默认只跑 `chromium`（提速）。
- 接受在 `playground/views/basic/*.tsx` 添加少量 `data-testid`（仅为稳定性与可维护性服务）。
- CI 上的 E2E 强制走 `pnpm run play:build` + `pnpm run play:preview`（贴近产物）；本地默认走 `pnpm run play`。

## Scope

- In：
  - 在 `e2e/` 下为 `/basic/*` 路由补齐回归用例，覆盖渲染、交互、状态更新与 `v-model` 行为。
  - 调整 `playwright.config.ts`：只保留 `chromium` 项目，并让 `webServer` 启动命令对齐 playground。
  - 必要时在 `playground/views/basic/*.tsx` 增加少量 `data-testid`（优先加在交互点与关键断言点）。
- Out：
  - 不变更 runtime/renderer 实现，仅为测试稳定性做最小页面标注（`data-testid`）。
  - 不引入额外的 E2E 断言框架或重写现有测试体系。

## 用例范围（按路由）

- `/basic`
  - 断言基础页面可渲染（标题/提示文案存在）。
- `/basic/hello-world`
  - 断言标题为「你好，世界」，并渲染默认消息「你好，世界！」。
- `/basic/handling-user-input`
  - 点击「反转消息」后，消息文本按字符反转。
  - 点击「追加 "！"」后，消息末尾追加 `！`。
  - 点击链接触发 `alert('导航已被阻止。')`，并断言页面未发生跳转（需要 Playwright `dialog` 监听/accept）。
- `/basic/attribute-bindings`
  - 断言 `title` 属性动态绑定生效（`span[title="你好，世界！"]`）。
  - 点击红色段落后颜色切换（可用 `toHaveCSS('color', ...)` 或 `data-testid` + class/style 断言）。
  - 点击绿色段落后在 `green` 与 `blue` 间切换（优先用 `toHaveCSS('color', ...)` 验证）。
- `/basic/conditionals-and-loops`
  - 「切换列表」：列表/占位文案在显示与隐藏之间切换。
  - 「追加数字/移除数字/反转列表」：列表内容与顺序正确更新（覆盖 push/pop/reverse 触发更新）。
- `/basic/form-bindings`
  - 文本输入：输入后「当前值」同步更新。
  - 单复选框：勾选状态与文案同步更新。
  - 单选框：选择项变更后文案同步更新。
  - 下拉/多选下拉：选择结果与文案同步更新。
- `/basic/simple-component`
  - 断言列表渲染出默认 grocery items（至少覆盖 1–2 条关键文案）。

## Action items（规划，不在本次执行）

- [ ] 梳理每个页面的最小稳定断言点与交互点，明确选择器策略（优先 role/text/id，必要时补 `data-testid`）。
- [ ] 设计 `e2e/` 用例结构：单文件 `e2e/basic.spec.ts` 或拆分为 `e2e/basic/*.spec.ts`（按路由分组）。
- [ ] 规划 `playwright.config.ts` 调整：
  - [ ] `projects` 默认只保留 `chromium`。
  - [ ] `webServer.command`：本地 `pnpm run play`；CI `pnpm run play:build && pnpm run play:preview`。
- [ ] 规划 handling-user-input 的 `dialog` 处理方式（`page.once('dialog', ...)`），避免 `alert` 导致用例挂起。
- [ ] 规划 flake 控制策略：只对“最终可见结果”断言，避免依赖内部实现与时间窗口；必要时用 `expect(...).toHaveText/toHaveCount/toHaveCSS` 的内置等待。
