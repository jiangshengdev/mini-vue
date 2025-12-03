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
