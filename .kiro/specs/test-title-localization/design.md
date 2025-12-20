# Design Document: 测试标题中文化

## Overview

本设计描述如何将项目测试用例中的英文标题（`describe` 和 `it` 的描述文本）统一转换为简体中文。由于这是一个一次性的批量修改任务，我们采用手动逐文件修改的方式，而非开发自动化工具。

## Architecture

### 方案选择

考虑到：

1. 测试标题的翻译需要理解上下文语义，自动翻译质量难以保证
2. 需要中文化的测试文件数量有限（约 30+ 个文件）
3. 项目已有大量中文标题可作为参考风格

采用**手动逐文件修改**的方式，按测试子域分批处理。

### 处理范围

需要中文化的测试文件分布在以下目录：

```
test/
├── jsx-runtime/          # 已大部分中文化
├── reactivity/           # 已大部分中文化，少量英文
│   ├── array/
│   ├── effect/
│   ├── effect-scope/
│   ├── ref/
│   └── watch/
├── router/               # 全英文，需要中文化
├── runtime-core/         # 混合，需要中文化
│   ├── app/
│   ├── component/
│   ├── mount/
│   ├── patch/
│   └── renderer/
├── runtime-dom/          # 混合，需要中文化
│   ├── app/
│   ├── component/
│   ├── context/
│   ├── error/
│   ├── props/
│   ├── ref/
│   └── render/
└── shared/               # 已大部分中文化
```

## Components and Interfaces

### 翻译规范

#### 术语处理

技术术语保持英文原样，不进行翻译：

- `render`、`mount`、`unmount`、`patch`
- `component`、`effect`、`reactive`、`ref`、`watch`
- `cleanup`、`handler`、`container`、`anchor`、`fragment`
- `props`、`children`、`scheduler`、`scope`
- `normalize`、`DEV`、`AST` 等

只翻译描述性文字，如：

- "throws friendly error" → "抛出友好错误"
- "inserts at anchor" → "在 anchor 处插入"
- "reuses host bindings" → "复用宿主绑定"

#### 标题风格

1. 使用简洁的陈述句描述测试行为
2. 保持与现有中文标题风格一致
3. 避免过长的标题，控制在 30 字以内
4. 技术术语可保留英文（如 `effect`、`ref`、`props`）

## Data Models

不涉及数据模型变更，仅修改测试文件中的字符串字面量。

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: 测试逻辑不变性

_For any_ 测试文件，中文化前后除了 `describe` 和 `it` 的标题字符串外，所有测试逻辑、断言、导入语句和辅助函数应保持完全相同。

**Validates: Requirements 2.4, 3.3**

### Property 2: 代码格式保持性

_For any_ 修改后的测试文件，应保持原有的缩进风格（2 空格）、单引号字符串、以及代码结构。

**Validates: Requirements 3.1, 3.2**

### Property 3: 测试可执行性

_For any_ 中文化后的测试文件，执行 `pnpm test` 应能正常运行且所有测试通过。

**Validates: Requirements 2.4**

## Error Handling

- 如果翻译后测试无法运行，需检查是否意外修改了代码逻辑
- 如果翻译语义不准确，需参考测试代码上下文重新翻译

## Testing Strategy

### 验证方式

1. **单元测试验证**：每批修改后运行 `pnpm test` 确保测试仍能通过
2. **浏览器测试验证**：运行 `pnpm test:browser` 确保 DOM 相关测试正常
3. **人工审核**：检查翻译质量和术语一致性

### 分批处理顺序

1. `test/router/` - 2 个文件
2. `test/runtime-core/patch/` - 3 个文件
3. `test/runtime-core/renderer/` - 1 个文件
4. `test/runtime-dom/component/` - 1 个文件
5. `test/runtime-dom/error/` - 3 个文件
6. `test/runtime-dom/render/` - 若干文件
7. 其他零散英文标题
