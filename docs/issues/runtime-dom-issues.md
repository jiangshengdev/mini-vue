# Runtime DOM 模块问题记录

## 1. DOM 渲染器未处理 SVG namespace（待修复）

- 位置：`src/runtime-dom/renderer-options.ts`
- 现状：`createElement()` 无论节点类型都调用 `document.createElement(type)`，没有在 SVG 子树中切换到 `createElementNS`。
- 影响：如在 `<svg>` 内创建 `circle`、`path` 等标签时，这些节点会以 `HTMLUnknownElement` 的形式插入，最终不会出现在渲染结果里。
- 提示：需要在渲染 SVG 子树时使用 `http://www.w3.org/2000/svg` namespace 来创建元素，避免整棵 SVG 树丢失。
- 可能方案：
  - 在 `renderer-options` 内区分当前父节点 namespace（可借助 `parent.namespaceURI` 判断），SVG 子树使用 `document.createElementNS(svgNS, type)` 创建。
  - `patchProps` 同步对 `xlink:href` 等需要命名空间的属性做适配，避免创建正确元素却因属性缺失导致渲染异常。

## 2. SVG 元素写入 className 会抛出异常（待修复）

- 位置：`src/runtime-dom/props/index.ts`
- 现状：`class`/`className` 分支直接对 `element.className` 赋字符串；但在 SVG 元素上该属性为只读 `SVGAnimatedString`。
- 影响：带有 `class` 属性的 `<svg>` 节点在 patch 阶段会触发 `TypeError`，导致整次渲染失败，无法继续创建后续 DOM。
- 提示：需要在处理 SVG 元素时改用 `setAttribute('class', ...)` 等通用路径，或基于 `ownerSVGElement` 判断写入方式。
- 可能方案：
  - 在 `class`/`className` 分支检测 `element instanceof SVGElement`（或检查 `namespaceURI`），SVG 节点统一走 `setAttribute('class', normalizedClass)`。
  - 若后续扩展 style/attr 逻辑，也应基于 namespace 选择合适的写入 API，避免 SVG 特有属性走 HTMLElement 路径。

## 3. 字符串容器选择器为非法 CSS 时会直接抛出异常（已修复）

- 位置：`src/runtime-dom/create-app.ts`
- 现状：`resolveContainer()` 在 `target` 为字符串时直接调用 `document.querySelector(target)`；当 `target` 是非法 CSS 选择器（如 `'#app['`）会抛出 `SyntaxError`，目前未捕获。
- 影响：`createApp().mount(selector)` 会同步崩溃，且错误并非 「未找到容器」 的语义，导致定位成本较高。
- 提示：对 `querySelector` 添加 try/catch（至少捕获 `SyntaxError`）并转换为更友好的错误信息或返回 `undefined` 走现有 「未找到容器」 分支。

## 4. insertBefore 忽略 parent 且不兼容 anchor 为 null 的标准语义（已修复）

- 位置：`src/runtime-dom/renderer-options.ts`
- 现状：`insertBefore(_parent, child, anchor)` 直接调用 `(anchor as ChildNode).before(child)`，忽略 `parent` 参数。
- 影响：
  - 语义上偏离标准 DOM `parent.insertBefore(child, anchor)`：当 `anchor` 并非 `parent` 的子节点时，`before` 行为不可控且可能抛错。
  - 也无法兼容更通用的渲染器约定：很多渲染器会允许 `anchor === null` 表示追加到末尾（此时当前实现会因访问 `null.before` 而抛错）。
- 提示：优先使用 `parent.insertBefore(child, anchor)` 作为宿主实现；如未来要支持 `anchor === null`，可在宿主层分支到 `appendChild`。

## 5. 测试访问组件实例私有属性（待优化）

- 位置：`test/runtime-dom/component/component.test.tsx`
- 现状：直接访问 `instance.cleanupTasks`。
- 影响：这是组件实例的内部属性，属于白盒测试，增加了与内部实现细节的耦合。
- 提示：应测试清理逻辑的副作用（如 spy 是否被调用），而非检查内部任务队列。

## 6. 测试修改全局原型（待优化）

- 位置：`test/runtime-dom/render/basic.test.tsx`
- 现状：修改 `Element.prototype.remove` 原型方法进行 spy。
- 影响：虽然在 `finally` 中恢复了，但在并发测试环境下修改全局对象原型存在风险，且可能干扰其他测试。
- 提示：建议使用 `vi.spyOn` 针对特定实例或使用更安全的 mock 方式。

## 7. 无 DOM/SSR 环境下 import 即抛错（待修复）

- 位置：`src/runtime-dom/create-app.ts`
- 现状：模块加载阶段直接依赖 `document`、`import.meta.hot` 与 DOM 原语；在 SSR、Node 或无 DOM 的测试环境中仅 import 模块就会抛 `ReferenceError`/`TypeError`，无法按需降级或延迟加载。
- 影响：阻塞 SSR 构建与无 DOM 环境的单元测试，破坏「平台检测后按需启用」的预期。
- 可能方案：
  - 在模块顶层增加环境探测，若不存在 `document` 则提前导出 no-op 的 `render/createApp` 或抛出明确错误，并延迟访问 DOM 对象到运行时。
  - 将 DOM 依赖收敛到运行时分支，例如在 `mount` 过程中再执行 `document.querySelector`，并用条件判断包装 `import.meta.hot`。
  - 为无 DOM 环境提供可注入的宿主实现（如通过参数传入自定义 renderer），避免硬编码全局 DOM。
