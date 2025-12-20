# Design Document

## Overview

本设计文档描述如何为 mini-vue 的 `src` 目录下的 TypeScript 源码补充中文前置注释。核心实现分布在多个子域中（reactivity/runtime-core/runtime-dom/jsx/router/shared 等），当前阅读成本主要来自：

- 关键函数/类型缺少职责说明，读者需要在调用链中跳转理解
- 分支/循环的策略性代码块缺少意图解释，容易误读边界与假设

目标是在**不改动任何业务逻辑**的前提下，为 `src` 下的代码补充**中文、逻辑导向、前置**注释，使读者能更快理解模块职责与关键控制流。

## Architecture

### 执行流程

注释补全采用「目录分批」策略，按 `src` 一级子目录逐步推进：

```
┌─────────────────────────────────────────────────────────────┐
│                    注释补全执行流程                           │
├─────────────────────────────────────────────────────────────┤
│  Phase 0: 准备与对齐                                         │
│    ├── 读取注释风格示例                                       │
│    └── 建立文件清单生成方式                                   │
│                                                             │
│  Phase 1: 按目录补全注释                                     │
│    ├── jsx-foundation → jsx-runtime → messages              │
│    ├── reactivity → router                                  │
│    └── runtime-core → runtime-dom → shared                  │
│                                                             │
│  Phase 2: 抽样复核与验证                                     │
│    ├── 抽样复核（每目录至少 1 个核心文件）                     │
│    └── 运行相关测试                                          │
└─────────────────────────────────────────────────────────────┘
```

### 每个目录任务的固定步骤

1. **读取注释风格示例**：`src/runtime-core/create-app.ts`、`src/runtime-core/renderer.ts`
2. **读取目标目录上下文**：先从 `index.ts` 与最核心的入口文件开始，构建调用链
3. **生成目标文件清单**：在任务输入中显式列出要修改的文件路径
4. **逐文件补注释**：按「导出 API → 核心逻辑 → 工具函数/类型」顺序推进
5. **最小验证**：优先跑与改动域相关的测试

## Components and Interfaces

### 注释风格规范

#### 注释写什么（意图优先）

注释应回答「为什么/为了什么/依赖什么/边界是什么」，而不是复述代码表面语义：

| 类别 | 说明 |
|------|------|
| 职责 | 函数/类型/类的目的与对外可见行为 |
| 假设 | 输入约束、依赖前置条件、不变量 |
| 调用关系 | 与上层/下层函数的连接点，数据流方向 |
| 策略 | 分支选择原因、循环处理策略、回退路径 |

#### 注释放哪里（结构化覆盖）

- **所有函数**（全局函数、类方法、对象字面量函数）在声明前必须有职责注释
- **所有 interface** 及其属性都必须有前置注释
- **所有类的属性**（实例/静态/getter/setter）必须有前置注释
- **函数体内部**：关键分支/循环/需要推理的语句块必须在代码块上方写明目的与策略

#### 注释形态（推荐用法）

| 场景 | 推荐形式 |
|------|----------|
| 导出函数 / 重要类型 / 大逻辑块 | `/** ... */`（多行） |
| 函数体内部解释策略 | `/* ... */` 单段说明 |
| 简单概述 | `// ...` 单行 |

#### 约束

- 禁止同一段代码上方堆叠多个块注释；需要补充信息时应合并为一个注释
- 已有注释清晰则不重复；若不准确，允许**修改**以贴合真实逻辑
- **禁止行尾注释**
- **语言必须为中文**

### 目录级关注点

| 目录 | 重点关注 |
|------|----------|
| `src/reactivity/**` | 响应式依赖追踪/触发、effect 生命周期、ref/computed/watch 的时序与清理 |
| `src/runtime-core/**` | VNode/组件实例、mount/patch 流程、错误处理与边界 |
| `src/runtime-dom/**` | 宿主实现细节（DOM 属性/事件/类名合并），与 runtime-core options 的契约 |
| `src/jsx-foundation/**` | VNode 工厂、children 归一化、与 JSX runtime 的边界 |
| `src/jsx-runtime/**` | `jsx/jsxs/jsxDEV/h` 等封装的语义差异与开发态处理 |
| `src/router/**` | 路径归一化、导航状态、`RouterLink/RouterView` 的渲染时机与依赖 |
| `src/shared/**` | 跨域工具、错误通道、环境检测与注入机制 |
| `src/messages/**` | 错误/警告文案的组织方式与对外导出约束 |

## Data Models

本 spec 不涉及数据模型变更，仅对现有源码添加注释。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

本 spec 的工作性质为「文档/注释补全」，不涉及可执行代码的功能实现，因此不适用 Property-Based Testing。

验证方式改为人工复核 Checklist：

1. 注释是否解释了意图/边界而非复述代码？
2. 是否存在遗漏的关键分支/循环说明？（遗漏视为失败）
3. 是否引入了任何逻辑改动、格式扰动（大量空行/重排）？
4. 是否出现行尾注释？
5. 是否出现非中文注释？

## Error Handling

### 任务失败条件

- 修改了未被点名的文件
- 改变了业务逻辑、函数签名或执行路径
- 遗漏了任何需要读者思考才能理解的语句块的注释
- 使用了行尾注释
- 使用了非中文注释

### 恢复策略

- 使用 Git 回滚到任务开始前的状态
- 重新执行任务，确保遵循约束

## Testing Strategy

### 验证方式

由于本 spec 不涉及功能代码实现，采用以下验证方式：

1. **人工复核**：按 Checklist 抽样检查每个目录至少 1 个核心文件
2. **相关测试**：按目录选择对应 `test/<domain>/**` 运行，确保注释改动未误触代码结构

### 测试命令

```bash
# 按目录运行相关测试
pnpm run test -- test/reactivity/**
pnpm run test -- test/runtime-core/**
pnpm run test -- test/runtime-dom/**
# ... 其他目录类似
```

### 复核 Checklist

- [ ] 无行尾注释
- [ ] 全部使用中文
- [ ] 无逻辑变更
- [ ] 关键分支/循环无遗漏
- [ ] 不堆叠块注释
