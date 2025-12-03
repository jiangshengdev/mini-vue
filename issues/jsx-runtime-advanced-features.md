# JSX Runtime 模块先进特性检查

本文档记录 `src/jsx-runtime` 目录下的代码针对 ES2022+ 及 TypeScript 5.9 新语法/特性的检查结果。

## 已采用的先进特性

### 1. `Object.hasOwn` 用于属性检查

- 位置：`src/jsx-runtime/shared.ts:32`
- 现状：已正确使用 `Object.hasOwn(props, 'key')` 替代 `Object.prototype.hasOwnProperty.call()`，这是 ES2022 新增的更安全、更简洁的 API。
- 收益：避免原型链污染问题，代码更清晰。

### 2. 空值合并操作符 (`??`)

- 位置：`src/jsx-runtime/shared.ts:32, 80`
- 现状：使用 `explicitKey ?? (...)` 和 `normalizedProps ?? ({} as ElementProps<T>)` 进行空值合并，这是 ES2020 引入的特性（项目 target 已包含）。
- 收益：简洁的空值处理逻辑，相比 `||` 操作符更精确地处理 `null`/`undefined` 值。

### 3. Rest/Spread 语法用于对象解构

- 位置：`src/jsx-runtime/shared.ts:27-29, 78-82`
- 现状：使用 `const { key: extractedKey, ...restProps } = props` 和 spread 语法组装新对象，这些是现代 JavaScript 的标准特性。
- 收益：简化对象操作，代码更具表达力。

## 可优化的改进机会

### 1. 使用 `satisfies` 操作符增强类型安全（TypeScript 4.9+）

- 位置：`src/jsx-runtime/shared.ts:78-82`
- 现状：当前代码使用 `as ElementProps<T>` 进行类型断言，这可能掩盖类型错误。

```typescript
const propsWithChildren: ElementProps<T> = {
  ...(normalizedProps ?? ({} as ElementProps<T>)),
  children,
}
```

- 建议：考虑使用 `satisfies` 操作符让 TypeScript 在保持推断类型的同时验证兼容性：

```typescript
const propsWithChildren = {
  ...(normalizedProps ?? {}),
  children,
} satisfies Partial<ElementProps<T>>
```

但需评估是否与现有类型定义兼容。若 `ElementProps<T>` 定义足够精确且不包含 `children` 字段的索引签名，可能需要调整类型定义，因此暂不强制推荐。

### 2. 使用 `Array.prototype.at()` 简化数组访问（ES2022）

- 位置：不适用
- 现状：当前代码未涉及复杂的数组索引访问（如负数索引），`children` 参数使用 `...children` rest 参数和 `.length` 判断。
- 建议：若未来有需要从末尾访问数组元素的场景（如 `children[children.length - 1]`），可使用 `children.at(-1)` 简化。目前无此需求，不建议修改。

### 3. 使用 `const` 类型参数（TypeScript 5.0+）提升类型推断

- 位置：`src/jsx-runtime/runtime.ts`、`src/jsx-runtime/shared.ts` 的泛型函数签名
- 现状：当前泛型函数 `jsx`、`jsxDEV`、`h` 等使用 `<T extends ElementType>` 约束，类型推断依赖调用时的实参。

```typescript
export function jsx<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T>
```

- 建议：若需要更精确的字面量类型推断（如 `type` 参数是字符串字面量 `"div"` 而非 `string`），可考虑使用 `const` 类型参数（TypeScript 5.0）：

```typescript
export function jsx<const T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  key?: PropertyKey,
): VirtualNode<T>
```

- 评估：需确认 `ElementType` 和 `VirtualNode<T>` 的定义是否受益于更精确的字面量类型。若当前类型推断已满足需求，可保持现状。仅当需要区分不同字符串字面量类型（如 `"div"` vs `"span"`）用于类型级别的静态检查时才有实际价值。

### 4. 使用 `using` 声明自动资源管理（TypeScript 5.2+，需 ES2022+ Symbol.dispose）

- 位置：不适用
- 现状：当前模块未涉及需要手动清理的资源（如文件句柄、订阅等）。
- 建议：若未来引入需要清理的资源，可考虑实现 `Symbol.dispose` 并使用 `using` 声明确保资源自动释放。目前无此需求。

## 代码风格与最佳实践

### 1. 函数重载声明（当前未使用）

- 位置：`src/jsx-runtime/shared.ts:63-85` 的 `h` 函数
- 现状：`h` 函数通过运行时 `children.length` 判断分支，单一签名使用 rest 参数 `...children: ComponentChildren[]`。
- 建议：可使用 TypeScript 函数重载明确区分无 children 和有 children 的调用签名，提升类型提示精度：

```typescript
export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
): VirtualNode<T>
export function h<T extends ElementType>(
  type: T,
  props: ElementProps<T> | null | undefined,
  ...children: ComponentChildren[]
): VirtualNode<T>
export function h<T extends ElementType>(
  type: T,
  props?: ElementProps<T>,
  ...children: ComponentChildren[]
): VirtualNode<T> {
  // 实现保持不变
}
```

- 评估：重载可提升 IDE 自动补全体验，但会增加类型复杂度。若当前单一签名已满足使用需求，可暂不修改。

### 2. 显式标注纯函数（`/* @__PURE__ */`）辅助 Tree-shaking

- 位置：`src/jsx-runtime/runtime.ts:18`、`src/jsx-runtime/shared.ts:44, 63`
- 现状：导出的函数 `jsx`、`jsxs`、`jsxDEV`、`h`、`buildVirtualNode` 均为纯函数，但未添加 `/* @__PURE__ */` 注释。
- 建议：虽然现代打包工具（如 Rollup、Vite）通常能自动识别纯函数，显式标注 `/* @__PURE__ */` 可确保在复杂场景下被正确 tree-shake：

```typescript
export const jsxs = /* @__PURE__ */ jsx
```

- 评估：这是构建优化而非语法特性，且当前代码已非常简洁。若打包产物体积敏感，可考虑添加；否则保持现状即可。

## 总结

`src/jsx-runtime` 目录下的代码已合理采用 ES2022 的 `Object.hasOwn` 等先进特性，整体代码质量较高。针对 TypeScript 5.9 的新特性（如 `const` 类型参数、`satisfies` 操作符），当前实现暂无强烈的改造需求，仅在需要更精确的类型推断或增强类型安全时才值得引入。建议在保持代码简洁性与可维护性的前提下，优先考虑实际收益再决定是否升级。
