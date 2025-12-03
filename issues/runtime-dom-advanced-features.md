# Runtime DOM 模块 ES2022+ 与 TypeScript 5.9 及以下新特性检查

## 1. `Object.hasOwn` 与 `in` 操作符的选择

- 位置：`src/runtime-dom/patch-props.ts:85`
- 现状：使用 `name in element.style` 判断样式属性是否可直接赋值。
- 分析：在此场景下，`in` 操作符是正确选择，因为 CSS 属性定义在 `CSSStyleDeclaration` 的原型链上（作为 getter/setter），而非对象自有属性。使用 `Object.hasOwn(element.style, name)` 会导致无法检测到有效的 CSS 属性，破坏样式应用逻辑。
- 判断：当前实现已是最佳实践，无需修改。ES2022 的 `Object.hasOwn` 适用于检查自有属性的场景，但不适用于需要原型链查找的 DOM 宿主对象。

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

## 7. TypeScript 4.9+ `satisfies` 操作符

- 位置：`src/runtime-dom/renderer-options.ts:10`
- 现状：使用显式类型标注 `export const domRendererOptions: RendererOptions<Node, Element, DocumentFragment> = { ... }`，确保导出常量具有明确的类型。
- 分析：显式类型标注是正确选择，因为导出的 `domRendererOptions` 需要为模块消费者提供准确的类型信息。若改用 `satisfies` 操作符，TypeScript 会推断出更宽泛的字面量类型，可能导致类型不匹配或丢失接口约束，破坏类型安全。
- 判断：当前实现已是最佳实践，无需修改。`satisfies` 操作符适用于需要保留字面量类型推断的场景，但不适用于需要导出特定接口类型的常量声明。

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

`src/runtime-dom` 模块已在部分场景（Error Cause、可选链）中采用 ES2022 特性，代码现代化程度较高。经过详细分析，现有代码已针对各自场景选择了最佳实践：

- **已正确使用现代特性**：Error Cause（ES2022）、可选链操作符（ES2020）。
- **已采用最佳实践**：`in` 操作符用于 DOM 宿主对象原型链查找、显式类型标注用于导出常量。
- **无适用场景**：类字段、顶层 `await`、TypeScript 5.2+ `using` 声明、正则 `/d` 标志、`Array.prototype.at()`、`const` 类型参数等特性在当前架构下无适用场景。

整体而言，`src/runtime-dom` 代码已充分利用 ES2022 与 TypeScript 5.9 及以下版本的现代语法特性，无需额外优化。建议在后续重构或新增功能时继续保持对现代特性的合理运用。
