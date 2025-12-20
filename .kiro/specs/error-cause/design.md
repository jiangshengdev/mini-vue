# Design Document: Error Cause

## Overview

本设计文档描述如何为 mini-vue 框架中缺少 `cause` 属性的错误添加该属性。通过分析现有代码，识别出以下需要添加 cause 的错误抛出点：

**Router 模块：**
- `src/router/core/injection.ts` - `useRouter()` 中的 `routerNotFound` 错误
- `src/router/core/create-router.ts` - `install()` 中的 `routerDuplicateInstallOnApp` 错误

**Runtime-Core 模块：**
- `src/runtime-core/provide-inject.ts` - `provide()` 中的 `runtimeCoreProvideOutsideSetup` 错误
- `src/runtime-core/provide-inject.ts` - `inject()` 中的 `runtimeCoreInjectOutsideSetup` 错误
- `src/runtime-core/renderer.ts` - `asContainerKey()` 中的 `runtimeCoreInvalidContainer` 错误
- `src/runtime-core/create-app.ts` - `use()` 中的 `runtimeCoreInvalidPlugin` 错误

## Architecture

本功能不引入新的架构组件，仅在现有错误抛出点添加 `{ cause }` 选项。

### 修改策略

对于每个错误抛出点，根据上下文选择合适的 cause 值。cause 应该包含能帮助调试的上下文信息，具体值由实现者根据实际情况决定。

**需要添加 cause 的错误点：**

| 错误位置 | 错误消息 | cause 建议 |
|---------|---------|---------|
| `useRouter()` | `routerNotFound` | 相关上下文信息 |
| `router.install()` | `routerDuplicateInstallOnApp` | 相关上下文信息 |
| `provide()` | `runtimeCoreProvideOutsideSetup` | 相关上下文信息 |
| `inject()` | `runtimeCoreInjectOutsideSetup` | 相关上下文信息 |
| `asContainerKey()` | `runtimeCoreInvalidContainer` | 相关上下文信息 |
| `app.use()` | `runtimeCoreInvalidPlugin` | 相关上下文信息 |

**cause 值选择原则：**
- 优先选择导致错误的直接原因（如无效的输入值）
- 或者选择能帮助定位问题的上下文对象
- 实现者可根据具体场景灵活调整

## Components and Interfaces

### 现有接口（无变更）

JavaScript 原生 Error 构造函数已支持 `cause` 选项：

```typescript
// 已有的 Error 构造函数签名
new Error(message: string, options?: { cause?: unknown })
new TypeError(message: string, options?: { cause?: unknown })
```

### 修改点

修改方式为在现有 `throw new Error(message)` 或 `throw new TypeError(message)` 语句中添加 `{ cause: <contextValue> }` 选项。

具体的 cause 值由实现者根据每个错误点的上下文灵活决定。

## Data Models

无新增数据模型。所有 cause 值使用 `unknown` 类型，与 JavaScript 原生 Error 的 cause 类型保持一致。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

基于 prework 分析，本功能主要通过示例测试验证，因为每个错误点的 cause 值是特定的、可预测的。

### Property 1: 无效输入错误包含输入值作为 cause

*For any* 因无效输入而抛出的错误（如无效插件、无效容器），该错误的 `cause` 属性 SHALL 等于导致错误的输入值。

**Validates: Requirements 2.1**

## Error Handling

本功能本身是关于错误处理的改进，不引入新的错误处理逻辑。所有修改仅在现有 `throw` 语句中添加 `{ cause }` 选项。

## Testing Strategy

### 单元测试

由于本功能修改的是错误抛出行为，测试策略如下：

1. **Router 模块测试**
   - 测试 `useRouter()` 在组件外调用时抛出的错误包含 `cause` 属性
   - 测试 `router.install()` 重复安装时抛出的错误包含 `cause` 属性

2. **Runtime-Core 模块测试**
   - 测试 `provide()` 在组件外调用时抛出的错误包含 `cause` 属性
   - 测试 `inject()` 在组件外调用时抛出的错误包含 `cause` 属性
   - 测试 `createRenderer` 传入无效容器时抛出的错误包含 `cause` 属性
   - 测试 `app.use()` 传入无效插件时抛出的错误包含 `cause` 属性

### 测试框架

使用项目现有的 Vitest 测试框架，通过 `try-catch` 捕获错误并验证 `error.cause` 属性存在且包含有意义的值。

```typescript
// 测试示例
it('should include cause in error', () => {
  const invalidPlugin = 'not-a-plugin'
  
  try {
    app.use(invalidPlugin as any)
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError)
    expect((error as Error).cause).toBeDefined()
  }
})
```
