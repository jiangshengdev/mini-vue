# Runtime DOM 模块问题记录

## 1. DOM 渲染器未处理 SVG namespace（待修复）

- 位置：`src/runtime-dom/renderer-options.ts`
- 现状：`createElement()` 无论节点类型都调用 `document.createElement(type)`，没有在 SVG 子树中切换到 `createElementNS`。
- 影响：如在 `<svg>` 内创建 `circle`、`path` 等标签时，这些节点会以 `HTMLUnknownElement` 的形式插入，最终不会出现在渲染结果里。
- 提示：需要在渲染 SVG 子树时使用 `http://www.w3.org/2000/svg` namespace 来创建元素，避免整棵 SVG 树丢失。

## 2. SVG 元素写入 className 会抛出异常（待修复）

- 位置：`src/runtime-dom/patch-props.ts`
- 现状：`class`/`className` 分支直接对 `element.className` 赋字符串；但在 SVG 元素上该属性为只读 `SVGAnimatedString`。
- 影响：带有 `class` 属性的 `<svg>` 节点在 patch 阶段会触发 `TypeError`，导致整次渲染失败，无法继续创建后续 DOM。
- 提示：需要在处理 SVG 元素时改用 `setAttribute('class', ...)` 等通用路径，或基于 `ownerSVGElement` 判断写入方式。

## 3. 字符串容器选择器为非法 CSS 时会直接抛出异常（已修复）

- 位置：`src/runtime-dom/create-app.ts`
- 现状：`resolveContainer()` 在 `target` 为字符串时直接调用 `document.querySelector(target)`；当 `target` 是非法 CSS 选择器（如 `'#app['`）会抛出 `SyntaxError`，目前未捕获。
- 影响：`createApp().mount(selector)` 会同步崩溃，且错误并非 “未找到容器” 的语义，导致定位成本较高。
- 提示：对 `querySelector` 添加 try/catch（至少捕获 `SyntaxError`）并转换为更友好的错误信息或返回 `undefined` 走现有 “未找到容器” 分支。

## 4. insertBefore 忽略 parent 且不兼容 anchor 为 null 的标准语义（已修复）

- 位置：`src/runtime-dom/renderer-options.ts`
- 现状：`insertBefore(_parent, child, anchor)` 直接调用 `(anchor as ChildNode).before(child)`，忽略 `parent` 参数。
- 影响：
  - 语义上偏离标准 DOM `parent.insertBefore(child, anchor)`：当 `anchor` 并非 `parent` 的子节点时，`before` 行为不可控且可能抛错。
  - 也无法兼容更通用的渲染器约定：很多渲染器会允许 `anchor === null` 表示追加到末尾（此时当前实现会因访问 `null.before` 而抛错）。
- 提示：优先使用 `parent.insertBefore(child, anchor)` 作为宿主实现；如未来要支持 `anchor === null`，可在宿主层分支到 `appendChild`。
