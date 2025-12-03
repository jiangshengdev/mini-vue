# shared 与 JSX 运行时模块 ES2022+ 与 TS 5.2-5.9 特性检查

> 本文档检查范围包括：ES2022+ JavaScript 特性 和 TypeScript 5.2 至 5.9 引入的新特性。同时记录符合现代最佳实践的 API 使用情况（如 queueMicrotask）。

## 1. `src/shared/error-handling.ts` - Error cause 特性已正确使用 ✅

- 位置：`src/shared/error-handling.ts:76`
- 现状：在 `rethrowAsync` 函数中已使用 ES2022 的 Error cause 特性来包装非 Error 类型异常
- 代码：
  ```typescript
  throw new Error(String(error), { cause: error })
  ```
- 评价：符合 ES2022 标准，无需改进。这是正确使用现代语法的典范。

## 2. `src/shared/utils.ts` - Object.hasOwn 特性已正确使用 ✅

- 位置：`src/shared/utils.ts:34-36`
- 现状：已正确使用 ES2022 的 `Object.hasOwn` 替代传统的 `Object.prototype.hasOwnProperty.call`
- 代码：
  ```typescript
  export function hasOwn(target: ReactiveTarget, key: PropertyKey): boolean {
    return Object.hasOwn(target, key)
  }
  ```
- 评价：符合 ES2022 标准，提升了可读性和类型安全性。

## 3. `src/shared/utils.ts` - 字符串负数索引判断已采用最佳方案 ✅

- 位置：`src/shared/utils.ts:52`
- 现状：使用 `key.startsWith('-')` 判断字符串键名是否表示负数索引
- 代码上下文：此函数用于验证传入的属性键（可能是字符串、数字或 symbol）是否代表合法的数组索引
- 评价：**这是正确且高效的实现**。判断字符串是否以负号开头是验证非法索引的必要步骤，`startsWith('-')` 是此场景的最佳选择。
- 备注：ES2022 的 `Array.prototype.at()` 是用于运行时访问数组元素的方法（如 `arr.at(-1)` 获取最后一个元素），与这里的字符串格式验证场景无关，不适用于此处。

## 4. `src/shared/error-handling.ts` - 可考虑使用 `using` 声明优化资源管理

- 位置：`src/shared/error-handling.ts:27-36`
- 现状：使用手动的状态管理 `currentMiniErrorHandler` 变量
- 潜在优化：对于需要临时覆盖错误处理器并确保恢复的场景，可引入 Symbol.dispose 模式（TypeScript 5.2+ 特性）
- 建议：
  ```typescript
  // 未来如需支持作用域级错误处理器临时替换，可创建：
  class ScopedErrorHandler implements Disposable {
    private previous: MiniErrorHandler | undefined
    
    constructor(handler: MiniErrorHandler) {
      this.previous = currentMiniErrorHandler
      currentMiniErrorHandler = handler
    }
    
    [Symbol.dispose]() {
      currentMiniErrorHandler = this.previous
    }
  }
  
  // 使用时：
  {
    using scopedHandler = new ScopedErrorHandler(customHandler)
    // 自动在作用域结束时恢复
  }
  ```
- 评价：**当前场景无需引入**。全局单例错误处理器模式已满足需求，仅在需要嵌套或作用域化错误处理时才值得考虑。

## 5. `src/shared/types.ts` - 类型定义简洁高效 ✅

- 位置：`src/shared/types.ts`
- 现状：使用 `Record<PropertyKey, unknown>` 和 `Record<string, unknown>` 定义通用类型
- 评价：已充分利用 TypeScript 内置工具类型，无需额外优化。`PropertyKey` 联合类型（string | number | symbol）的使用体现了现代 TS 最佳实践。

## 6. JSX 运行时入口文件 - 模块导出符合 verbatimModuleSyntax ✅

### 6.1 `src/index.ts` - 主入口文件

- 位置：`src/index.ts`
- 现状：严格遵循 `verbatimModuleSyntax` 配置，类型导出使用 `export type`，值导出使用 `export`
- 代码示例：
  ```typescript
  export type { ElementRef } from '@/runtime-dom/index.ts'
  export { reactive, effect, watch, computed, ref, isRef, unref, toRef, 
           effectScope, getCurrentScope, onScopeDispose, setMiniErrorHandler } from './reactivity/index.ts'
  export type { Ref, ComputedGetter, ComputedSetter, WritableComputedOptions,
                EffectScope, MiniErrorContext, MiniErrorHandler } from './reactivity/index.ts'
  export { createApp, render } from './runtime-dom/index.ts'
  export type { SetupFunctionComponent } from './jsx/index.ts'
  ```
- 评价：完全符合 TypeScript 5.0+ `verbatimModuleSyntax` 严格模式要求，保证类型与值的导入导出明确分离，避免运行时代码污染。

### 6.2 `src/jsx-dev-runtime.ts` - JSX 开发运行时入口

- 位置：`src/jsx-dev-runtime.ts`
- 现状：仅包含简洁的 re-export 语句
- 代码：
  ```typescript
  export { Fragment } from './jsx/index.ts'
  export { h, jsx, jsxs, jsxDEV } from './jsx-runtime/index.ts'
  ```
- 评价：符合入口文件仅做导出的约定（参见仓库 copilot-instructions），无业务逻辑，结构清晰。

### 6.3 `src/jsx-runtime.ts` - JSX 生产运行时入口

- 位置：`src/jsx-runtime.ts`
- 现状：与 jsx-dev-runtime.ts 结构相同，仅包含 re-export
- 代码：
  ```typescript
  export { Fragment } from './jsx/index.ts'
  export { h, jsx, jsxs, jsxDEV } from './jsx-runtime/index.ts'
  ```
- 评价：与开发运行时保持一致的导出结构，遵循框架约定。React 风格的 JSX 运行时通常会区分 dev 和 prod 版本，这里为简化实现暂时保持相同导出。

## 7. `src/shared/utils.ts` - Number.isInteger 正确使用 ✅

- 位置：`src/shared/utils.ts:47, 59`
- 现状：使用 ES2015 的 `Number.isInteger()` 进行整数判断
- 评价：虽非 ES2022 新增，但相比传统的 `value % 1 === 0` 更语义化且安全（不会发生类型强制转换），符合现代最佳实践。

## 8. `src/shared/error-handling.ts` - queueMicrotask 现代最佳实践 ✅

- 位置：`src/shared/error-handling.ts:70`
- 现状：使用标准的 `queueMicrotask` API 进行异步错误抛出
- 代码：
  ```typescript
  queueMicrotask(() => {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(String(error), { cause: error })
  })
  ```
- 评价：`queueMicrotask` 是 WHATWG HTML 规范的标准 API（2019 年引入），在现代浏览器和 Node.js 等多种 JavaScript 运行时环境中广泛支持，相比 `Promise.resolve().then()` 更直接且语义明确。
- 备注：虽非 ES2022 新增特性，但作为现代异步编程的标准最佳实践，在本次检查中一并记录。

## 9. `src/shared/utils.ts` - 可考虑使用 satisfies 操作符优化类型注解（TS 4.9+）

- 位置：`src/shared/utils.ts`（类型保护函数）
- 现状：函数返回类型通过类型保护 `value is PlainObject` 明确标注
- 潜在优化：在某些需要同时保持字面量类型推断和类型约束的场景下，`satisfies` 可以提供更灵活的类型检查
- 评价：**当前实现已足够优秀**。类型保护（type predicate）在运行时判断场景下比 `satisfies` 更合适，因为它能影响控制流分析。

## 总结

本次检查的 6 个文件（`src/shared/` 目录下的 3 个文件：`error-handling.ts`、`types.ts`、`utils.ts`，以及 3 个 JSX 运行时入口文件：`index.ts`、`jsx-dev-runtime.ts`、`jsx-runtime.ts`）整体已充分利用 ES2022 和 TypeScript 5.2-5.9 的现代特性：

**已正确使用的现代特性：**
- ✅ ES2022 Error cause（error-handling.ts）
- ✅ ES2022 Object.hasOwn（utils.ts）
- ✅ TypeScript verbatimModuleSyntax 严格模式（所有文件）
- ✅ queueMicrotask 标准 API（error-handling.ts）
- ✅ 类型保护和工具类型（types.ts, utils.ts）

**暂无需引入的特性：**
- ⚠️ `using` 声明和 Symbol.dispose：当前全局单例模式已满足需求
- ⚠️ `Array.prototype.at()`：现有字符串判断逻辑更直接
- ⚠️ `satisfies` 操作符：类型保护在当前场景下更合适

**代码质量评价：**
代码已充分体现现代 JavaScript/TypeScript 最佳实践，类型安全性高，语义清晰。无强制需要改进的遗留旧式写法。
