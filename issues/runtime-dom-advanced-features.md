# Runtime DOM 模块 ES2022+ 与 TypeScript 5.9 新特性检查

## 1. `Object.hasOwn` 替代 `in` 操作符检查自有属性

- 位置：`src/runtime-dom/patch-props.ts:85`
- 现状：使用 `name in element.style` 判断样式属性是否可直接赋值，会同时检查原型链上的属性，虽然在 `CSSStyleDeclaration` 场景下影响不大，但不符合"仅检查自有属性"的语义。
- 建议：考虑使用 ES2022 的 `Object.hasOwn(element.style, name)` 替代 `name in element.style`，明确表达"检查对象自有属性"的意图，提升代码可读性与语义准确性。同时可避免潜在的原型污染风险（虽然 `CSSStyleDeclaration` 为宿主对象，风险较低）。
- 建议：改为 `Object.hasOwn(element.style, name)` 或保持现状（因为 `CSSStyleDeclaration` 是宿主对象，原型链查找在此场景下是合理的）。若团队倾向强调"自有属性"语义，可统一使用 `Object.hasOwn`；若认为原型链查找在样式属性场景更符合 DOM 规范，可保持 `in` 操作符。

## 2. `?.` 可选链简化节点移除逻辑

- 位置：`src/runtime-dom/renderer-options.ts:35`
- 现状：使用 `node.parentNode?.removeChild(node)` 已经正确使用了可选链操作符（ES2020 特性），无需进一步优化。
- 判断：已采用现代语法，符合 ES2022 要求。

## 3. `Array.prototype.at()` 用于数组末尾访问

- 位置：当前代码中未发现使用数组索引访问末尾元素的场景。
- 判断：`src/runtime-dom` 模块主要处理 DOM 操作和属性打补丁，没有复杂的数组操作，因此无需引入 `Array.prototype.at()`。

## 4. Error Cause 增强错误上下文

- 位置：`src/runtime-dom/create-app.ts:61`
- 现状：使用 `throw new Error('createApp: 未找到可用的挂载容器', { cause: target })`，已经正确使用了 ES2022 的 Error Cause 特性，将原始目标作为错误原因传递，便于调试。
- 判断：已采用 ES2022 新特性，符合最佳实践。

## 5. 类字段与私有字段

- 位置：整个 `src/runtime-dom` 目录
- 现状：所有文件均使用函数式编程风格，通过 `interface` + 函数实现，未定义类或使用类字段。
- 判断：当前架构不涉及类，无法应用类字段、私有字段（`#field`）、静态初始化块等 ES2022 类相关特性。若未来需要封装状态，可考虑引入类并使用这些特性。

## 6. 顶层 `await`

- 位置：整个 `src/runtime-dom` 目录
- 现状：所有模块均为同步逻辑，不涉及异步初始化或资源加载。
- 判断：当前场景无需顶层 `await`。若未来需要异步加载宿主环境配置或动态导入模块，可考虑使用该特性。

## 7. TypeScript 5.9 `satisfies` 操作符

- 位置：`src/runtime-dom/renderer-options.ts:10`
- 现状：使用显式类型标注 `export const domRendererOptions: RendererOptions<Node, Element, DocumentFragment> = { ... }`，确保对象字面量符合接口约束。
- 建议：可使用 TypeScript 4.9+ 的 `satisfies` 操作符（如 `export const domRendererOptions = { ... } satisfies RendererOptions<Node, Element, DocumentFragment>`），在保留类型推断的同时验证接口兼容性。但当前显式类型标注已足够清晰，引入 `satisfies` 的收益有限，可根据团队偏好决定是否采用。

## 8. TypeScript 5.0+ `const` 类型参数

- 位置：整个 `src/runtime-dom` 目录
- 现状：未发现需要推断字面量类型的泛型函数场景。
- 判断：`src/runtime-dom` 主要处理 DOM 操作和类型定义，不涉及需要 `const` 类型参数的泛型推断场景。

## 9. TypeScript 5.2+ `using` 声明与显式资源管理

- 位置：`src/runtime-dom/create-app.ts` 的 HMR 生命周期管理
- 现状：HMR 回调通过 `hot.on()` 和 `hot.dispose()` 手动管理，需要开发者显式清理资源。
- 建议：虽然 TypeScript 5.2 引入了 `using` 声明用于自动资源管理（需实现 `Symbol.dispose`），但 Vite HMR API 不支持该协议，且当前手动管理逻辑已足够清晰。引入 `using` 需要额外包装 HMR 对象，收益不明显，建议保持现状。

## 10. 正则表达式 `/d` 标志与索引捕获

- 位置：整个 `src/runtime-dom` 目录
- 现状：未使用正则表达式进行字符串解析或匹配。
- 判断：当前代码无需正则表达式相关特性。

## 总结

`src/runtime-dom` 模块已在部分场景（Error Cause、可选链）中采用 ES2022 特性，代码现代化程度较高。以下是可选的优化建议：

- **可考虑采用**：`Object.hasOwn` 替代 `in` 操作符（若团队强调自有属性语义）；TypeScript `satisfies` 操作符（若需要更灵活的类型推断）。
- **无需引入**：类字段、顶层 `await`、`using` 声明、正则 `/d` 标志等特性在当前架构下无适用场景。

整体而言，`src/runtime-dom` 代码已符合 ES2022 与 TypeScript 5.9 要求，暂无强制性升级需求。建议在后续重构或新增功能时优先考虑采用上述现代特性。
