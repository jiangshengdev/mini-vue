# Runtime Core 模块 ES2022+ 与 TypeScript 5.9 新语法检查

本文档聚焦 `src/runtime-core` 目录，识别可引入现代语法特性以提升可读性、类型安全与健壮性的机会。

## 1. 使用 `Object.hasOwn()` 替代 `hasOwnProperty` 调用

- **位置**：虽然当前代码中未显式调用 `Object.prototype.hasOwnProperty.call()`，但在未来扩展 props 处理或属性检查时可能引入
- **现状**：ES5 风格的 `Object.prototype.hasOwnProperty.call(obj, key)` 冗长且容易误用
- **建议**：使用 ES2022 的 `Object.hasOwn(obj, key)` 替代，语义更清晰且避免原型链污染
  - **收益**：代码更简洁，避免 `hasOwnProperty` 被对象自身属性覆盖的边界情况
  - **兼容性**：项目 `tsconfig.json` 已设置 `target: "ES2022"`，完全支持
  - **示例**：
    ```typescript
    // 旧写法
    if (Object.prototype.hasOwnProperty.call(props, 'ref')) { }
    
    // 新写法
    if (Object.hasOwn(props, 'ref')) { }
    ```

## 2. 使用 `Array.prototype.at()` 简化数组末尾访问

- **位置**：`src/runtime-core/renderer/mount-component.ts` 中访问数组元素，特别是 `virtualNode.children` 处理
- **现状**：当前代码通过 `children.length` 判断与索引访问 `children[0]`（第 61-65 行）
- **建议**：在需要访问数组最后一个元素或倒数位置时，使用 `Array.prototype.at(-1)` 替代 `arr[arr.length - 1]`
  - **收益**：负索引语法更直观，减少 `length - 1` 计算，降低 off-by-one 错误风险
  - **兼容性**：ES2022 原生支持，与当前 target 匹配
  - **示例场景**：若未来需要访问 children 最后一个元素
    ```typescript
    // 旧写法
    const lastChild = children[children.length - 1]
    
    // 新写法
    const lastChild = children.at(-1)
    ```
  - **注意**：当前代码访问 `children[0]` 已足够简洁，暂不需要改写；此建议适用于未来扩展场景

## 3. 使用 `satisfies` 运算符增强类型约束

- **位置**：`src/runtime-core/create-app.ts` 中 `AppState` 接口实例化（第 99-105 行）
- **现状**：对象字面量直接赋值给 `AppState<HostElement>` 类型变量，缺少字面量级别的类型检查
- **建议**：使用 TypeScript 4.9+ 的 `satisfies` 运算符，在保持类型推断的同时确保对象符合接口约束
  - **收益**：既能获得精确的字面量类型推断（如 `status: 'idle'` 推断为字面量而非 `string`），又能确保符合接口定义，避免遗漏或错误属性
  - **兼容性**：TypeScript 5.9 完全支持
  - **示例**：
    ```typescript
    // 当前写法
    const state: AppState<HostElement> = {
      status: 'idle',
      container: undefined,
      config,
      rootComponent,
      initialRootProps,
    }
    
    // 推荐写法（需结合具体场景评估收益）
    const state = {
      status: 'idle' as const,
      container: undefined,
      config,
      rootComponent,
      initialRootProps,
    } satisfies AppState<HostElement>
    ```
  - **注意**：当前场景中 `state` 仅在函数内部使用且类型明确，引入 `satisfies` 的实际收益有限；建议在对外暴露的配置对象或复杂字面量中优先考虑

## 4. 泛型 `const` 类型参数提升类型精度（TypeScript 5.0+）

- **位置**：`src/runtime-core/renderer.ts` 及其他涉及泛型函数的位置
- **现状**：泛型类型参数默认为可变类型，字面量类型在传递时会被拓宽
- **建议**：在需要保持字面量类型精确性的泛型参数上添加 `const` 修饰符
  - **收益**：防止字面量类型拓宽，保持更精确的类型推断，增强类型安全
  - **兼容性**：TypeScript 5.0+ 支持
  - **潜在场景**：若未来引入需要严格类型匹配的工厂函数或配置生成器，可考虑使用
    ```typescript
    // 示例（非当前代码）
    function createConfig<const T>(config: T): T {
      return config
    }
    
    // 调用时保持字面量类型
    const cfg = createConfig({ mode: 'production' })
    // cfg.mode 类型为 'production' 而非 string
    ```
  - **注意**：当前 `runtime-core` 模块主要处理运行时逻辑，泛型参数多为宿主节点类型而非配置字面量，此特性暂无明显适用场景

## 5. `using` 声明实现自动资源管理（TypeScript 5.2+）

- **位置**：`src/runtime-core/renderer/mount-component.ts` 的 `teardownComponentInstance` 与 `setCurrentInstance`/`unsetCurrentInstance` 配对（第 117-124 行）
- **现状**：通过 `try...finally` 手动保证 `unsetCurrentInstance` 执行，模式安全但略显冗长
- **建议**：引入 `Symbol.dispose` 与 `using` 声明，将 `currentInstance` 的设置与清理封装为可释放资源
  - **收益**：自动资源清理，减少 `try...finally` 样板代码，避免遗忘清理逻辑
  - **兼容性**：TypeScript 5.2+ 支持，但需要 polyfill `Symbol.dispose`（ES2024 提案）
  - **示例重构**：
    ```typescript
    // 定义资源管理器
    function withCurrentInstance<T>(
      instance: ComponentInstance<any, any, any, any>
    ): Disposable {
      setCurrentInstance(instance)
      return {
        [Symbol.dispose]() {
          unsetCurrentInstance()
        }
      }
    }
    
    // 使用 using 声明
    function invokeSetup(...) {
      return instance.scope.run(() => {
        using _instance = withCurrentInstance(instance)
        return instance.type(instance.props)
      })
    }
    ```
  - **注意**：需要在 `tsconfig.json` 中添加 `"lib": ["ES2024", "ESNext.Disposable"]` 或使用 polyfill；当前项目仅声明 `ES2022` 与 `DOM`，引入此特性需评估构建目标与浏览器兼容性
  - **推荐度**：中等。该特性显著提升代码安全性，但需要额外的运行时支持与配置变更

## 6. 错误 `cause` 属性已正确使用

- **位置**：`src/runtime-core/create-app.ts` 第 48 行、`src/runtime-core/renderer/mount-component.ts` 第 128、132 行
- **现状**：代码已正确使用 ES2022 的 `Error` 构造函数 `cause` 选项，用于附加上下文信息
  - **示例**：
    ```typescript
    throw new Error('createApp: 当前应用已挂载，不能重复执行 mount', { cause: state.container })
    throw new TypeError('组件作用域已失效，无法执行 setup', { cause: instance.scope })
    ```
- **评价**：✅ 已正确引入 ES2022 特性，无需改进

## 7. 可选的 `WeakMap.prototype.emplace()` 简化缓存操作（提案阶段）

- **位置**：`src/runtime-core/renderer.ts` 中 `mountedHandlesByContainer` 的 `get`/`set`/`delete` 操作（第 74-82 行）
- **现状**：通过 `get` 检查、条件分支与 `delete` 完成缓存管理，逻辑清晰但略显冗长
- **建议**：关注 `Map.prototype.emplace()` 提案（Stage 2），未来可简化"取值-判断-操作"模式
  - **示例（提案语法，当前不可用）**：
    ```typescript
    // 当前写法
    const mounted = mountedHandlesByContainer.get(asContainerKey(container))
    if (mounted) {
      mounted.teardown()
      mountedHandlesByContainer.delete(asContainerKey(container))
    }
    
    // 提案写法
    mountedHandlesByContainer.emplace(asContainerKey(container), {
      update: (existing) => {
        existing.teardown()
        return undefined // 删除
      }
    })
    ```
  - **注意**：该提案尚未进入 ES 标准，当前不建议引入；记录在此供未来参考

## 总结

### 可立即引入的特性
1. **`Object.hasOwn()`**（ES2022）：适用于未来扩展的属性检查场景，无需改动现有代码
2. **`Array.prototype.at()`**（ES2022）：适用于访问数组末尾元素的场景，当前代码暂无明显需求

### 需评估收益的特性
3. **`satisfies` 运算符**（TS 4.9+）：当前场景收益有限，建议在对外 API 或复杂配置对象中考虑
4. **泛型 `const` 参数**（TS 5.0+）：适用于需要保持字面量类型的工厂函数，当前无明显场景

### 需要额外配置的特性
5. **`using` 声明**（TS 5.2+）：可显著简化 `currentInstance` 管理，但需调整 `lib` 配置并考虑运行时兼容性

### 已正确使用的特性
6. **Error `cause`**（ES2022）：✅ 已正确引入

### 提案阶段特性
7. **`WeakMap.emplace()`**（Stage 2 提案）：仅供未来参考，当前不建议引入

## 建议优先级

**高**：无（当前代码已较好地利用 ES2022 特性，暂无强制升级项）

**中**：
- 在未来扩展 props 检查或属性操作时，优先使用 `Object.hasOwn()`
- 评估是否引入 `using` 声明简化 `currentInstance` 管理（需配置变更）

**低**：
- 在需要访问数组末尾元素时考虑 `Array.prototype.at()`
- 在对外暴露的配置对象中考虑 `satisfies` 运算符

**不建议**：
- 泛型 `const` 参数与 `WeakMap.emplace()` 在当前场景中收益不明显或不可用
