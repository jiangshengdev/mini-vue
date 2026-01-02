# 计划：Runtime DOM SVG 支持

补齐 `runtime-dom` 对 SVG 的最小支持，覆盖两个已知问题：

- DOM 渲染器在 SVG 子树中未切换 namespace，导致节点以 `HTMLUnknownElement` 插入并丢失渲染结果。
- SVG 元素写入 `className` 会抛出异常（`SVGAnimatedString` 只读），导致渲染中断。

整体策略：在 `runtime-core` 透传「当前子树 namespace」，并在 `runtime-dom` 根据 namespace 选择 `createElement`/`createElementNS`；同时在 props 层为 SVG 的 class 走 `setAttribute('class', ...)`。

## Scope

- In: SVG 子树 namespace 透传与元素创建、SVG `class`/`className` 写入修复、最小回归测试覆盖。
- Out: `foreignObject` 子树切回 HTML namespace、MathML、完整 SVG 属性/事件/样式兼容矩阵。

## 约定

- namespace 类型收敛为：`'html' | 'svg' | undefined`。
- 不在本计划内处理 `foreignObject` 的子树 namespace 切换。
- 仅支持字面量属性名 `'xlink:href'` 的 namespaced 写入（不做 `xlinkHref` 等映射）。

## Action items

[ ] 梳理 `createElement` 调用链与子节点环境透传点，确认最小改动面（`src/runtime-core/mount/**`、`src/runtime-core/patch/**`）。  
[ ] 扩展 `ChildEnvironment`/`PatchEnvironment` 增加可选 `namespace` 字段（`src/runtime-core/environment.ts`、`src/runtime-core/patch/children-environment.ts`）。  
[ ] 扩展 `RendererOptions.createElement` 支持 `(type, namespace?)`，并更新所有调用点（含 KeepAlive 的 `storageContainer` 创建）（`src/runtime-core/renderer.ts`、`src/runtime-core/mount/element.ts`、`src/runtime-core/components/keep-alive.tsx`）。  
[ ] 在元素 mount/patch 阶段基于标签名派生并向下透传 namespace：遇到 `svg` 切到 `'svg'`，其余默认继承父级（`src/runtime-core/mount/element.ts`、`src/runtime-core/patch/child.ts`）。  
[ ] 在 DOM 宿主实现 namespace-aware 创建：namespace 为 `'svg'` 时使用 `document.createElementNS('http://www.w3.org/2000/svg', type)`（`src/runtime-dom/renderer-options.ts`）。  
[ ] 修复 SVG 的 class 写入：`handleClassProp` 对 `SVGElement` 改用 `setAttribute('class', normalized)`，HTML 元素仍走 `.className`（`src/runtime-dom/props/class.ts`）。  
[ ] （可选）支持 `'xlink:href'`：在 attr 写入中对该 key 使用 `setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', value)`（`src/runtime-dom/props/attr.ts`）。  
[ ] 补充回归用例：验证 `<svg><circle /></svg>` 的 `namespaceURI`；验证 `<svg class="...">` 不抛错且 class 生效；覆盖一次 patch 更新（`test/runtime-dom/render/**`、`test/runtime-dom/props/class.test.tsx`）。  
[ ] 运行相关测试：`pnpm run test test/runtime-dom/props/class.test.tsx` 与新增的 SVG 用例文件，确保回归覆盖。
