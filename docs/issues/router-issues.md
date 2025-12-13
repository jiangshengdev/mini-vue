# Router 模块问题记录

## 1. `RouterLink` 无条件拦截点击，破坏新标签/新窗口等标准交互（已验证）

- 位置：`src/router/components/router-link.tsx`
- 现状：`handleClick` 只要拿到事件就会 `event.preventDefault()`，并无条件调用 `router.navigate(props.to)`；未检查 `Ctrl/Cmd/Shift/Alt` 等修饰键、鼠标中键、`target="_blank"`、或右键菜单等场景。
- 影响：用户无法通过 `Cmd/Ctrl + Click` 在新标签打开链接，也无法按浏览器默认行为进行“新窗口打开/后台打开/下载”等交互，偏离 Web 标准体验。
- 验证结论：成立。
- 下一步：在拦截前增加条件判断，仅在“普通左键点击 + 无修饰键 + 非 `_blank` + 未被 `event.defaultPrevented` 拦截”的情况下才 `preventDefault` 并执行 SPA 导航；其余情况交给浏览器默认行为。
- 测试建议：在 `test/router/**`（若暂无目录可新增）补充点击行为用例，覆盖 `metaKey/ctrlKey/shiftKey`、`button !== 0`、`target="_blank"` 等不应触发 `navigate` 的场景。

## 2. `navigate()` 在写入 history 前对路径归一化，导致 Query/Hash 丢失（已验证）

- 位置：`src/router/core/create-router.ts`、`src/router/core/paths.ts`
- 现状：`navigate(path)` 会先执行 `normalizePath(path)` 得到 `target`，随后 `history.pushState(null, '', target)`；而 `normalizePath` 内部会剥离 `?query` 与 `#hash`。
- 影响：导航到 `/search?q=vue#top` 时，地址栏最终只保留 `/search`，导致 URL 参数/哈希信息丢失；同时会影响“可分享链接/回放链接/刷新后恢复状态”等典型场景。
- 验证结论：成立。
- 下一步：将“用于匹配的规范化路径”和“用于写入地址栏的原始路径”分离：
  - 匹配/缓存键仍可使用规范化的 pathname；
  - `pushState` 应写入保留 query/hash 的完整 URL（或至少保留原始输入的 query/hash）。
  - 同时 `getCurrentBrowserPath()` 目前只读取 `location.pathname`，若希望路由状态感知 query/hash，需要读取并拼接 `location.search` / `location.hash`（取决于设计目标）。
- 测试建议：新增“navigate 保留 query/hash”的回归用例，并验证 `currentRoute`（或新增字段）与地址栏行为一致。

## 3. `RouterView` 缺乏嵌套深度感知，可能触发同组件无限递归渲染（已验证）

- 位置：`src/router/components/router-view.tsx`
- 现状：`RouterView` 直接渲染 `router.currentRoute.value.component`，没有根据嵌套路由层级/深度选择不同的匹配记录，也没有防止同一组件在同一路由层级重复渲染。
- 影响：当路由组件自身（或其子树中）再次使用 `RouterView` 时，会再次渲染同一个组件，形成同步递归，通常导致栈溢出。
- 验证结论：成立（在“路由组件内部包含 RouterView 且未切换到子路由记录”的用法下可稳定复现）。
- 下一步：引入“视图深度”概念：例如通过注入一个深度计数（父 RouterView 提供 `depth + 1`），每一层 RouterView 渲染该深度对应的匹配记录；若暂不支持嵌套路由，也至少要在检测到“当前 View 组件再次渲染自身”时给出保护（返回空或抛出明确错误）。
- 测试建议：新增“路由组件包含 RouterView 不应递归崩溃”的回归用例（可用一个组件内部直接渲染 RouterView 的场景验证）。

## 4. `normalizePath` 强制转小写且不可配置，可能破坏大小写敏感路径（已验证）

- 位置：`src/router/core/paths.ts`
- 现状：`normalizePath` 最终会对路径执行 `toLowerCase()`。
- 影响：对于大小写敏感的路径片段（例如某些 ID、资源路径、或后端区分大小写的路由规则），强制小写会破坏原始性；并且该行为目前不可配置。
- 验证结论：成立。
- 下一步：将“小写化”变为可选策略（例如 router config 中提供 `caseSensitive`/`normalize` 开关）；或仅在匹配层做大小写不敏感比较，而不改写用户输入与地址栏显示。
- 测试建议：补充大小写相关的匹配用例（大小写不同的 path 是否命中、地址栏是否保留原始输入）。

## 5. 同一 `app` 安装多个 `router` 时会产生多层 `unmount` 包装（已验证，影响修正）

- 位置：`src/router/core/create-router.ts`
- 现状：每个 router 在 `install` 时都会在满足条件时把 `app.unmount` 替换为包装函数。若同一个 `app` 依次 `use(routerA)`、`use(routerB)`，则 `routerB` 捕获的 `rawUnmount` 实际是 `routerA` 已包装过的版本，最终形成调用链：`routerB wrapper -> routerA wrapper -> 原始 unmount`。
- 影响：不会导致“先安装的 router 清理逻辑失效”（两者的清理逻辑都会执行），但会导致 `unmount` 包装层数增长、逻辑耦合变复杂，也更难调试。
- 验证结论：成立（会多层包装）；“导致前一个 router 清理逻辑失效”的结论不成立。
- 下一步：考虑将“卸载回收逻辑”集中到 app 层的统一 hook（例如只允许安装一次 wrapper，并在 wrapper 内广播/调用已注册的清理回调），避免多 router 叠加包装。
- 测试建议：若未来允许多 router 并存，补充“多 router 安装后 unmount 会依次 stop”的用例；若不支持该用法，应在文档中明确限制并在 install 时给出错误/警告策略。
