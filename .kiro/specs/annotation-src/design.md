# Design Document

## Overview

本设计文档描述如何对 mini-vue 的 `src/**` 源码注释进行**校正与补齐**：在不改动任何业务逻辑的前提下修正过时注释、补充缺失注释，并确保打开任意源码文件时都能快速理解其职责与关键控制流。

本次整改重点额外强调两点：

- **全文件覆盖**：每个文件至少 1 段文件级职责注释（Module_Comment）；每个函数都有职责注释。
- **控制啰嗦**：函数声明前只写短职责（1 句为主，最多 2 句）；实现细节分散写在函数体内部的关键语句块之前。

> 规范来源：`.github/prompts/annotation.prompt.md`（风格与硬约束）与 `.kiro/specs/annotation-src/requirements.md`（范围/覆盖/简洁口径）。

## Execution Flow

注释更新采用「按 `src` 一级子目录分批」策略，每个目录为一个任务单元：

1. **准备**：先阅读仓库内的注释风格示例文件（如 `src/runtime-core/create-app.ts`、`src/runtime-core/renderer.ts`）。
2. **点名全量文件**：用 `rg --files src/<子目录>` 或 `find src/<子目录> -type f` 生成该目录下的**全部文件**清单，并在任务输入中显式列出这些 Target_File。
3. **逐文件校正与补齐**：
   - 补齐文件顶部 Module_Comment（写职责/边界/连接点，不写实现流程）。
   - 为每个函数补齐职责注释（短职责），把算法/策略/边界拆到函数体内部的关键代码块之前。
   - 修正与当前逻辑不匹配的过时注释；准确的既有注释不重复添加。
4. **最小验证**：按改动域运行相关测试，降低误改代码结构的风险。
5. **收尾**：`.kiro/specs/annotation-src/tasks.md` 是可复用模板，仓库内提交时保持全部为 `[ ]`；进度记录在 PR/Issue 或另存副本中。

## Comment Layering

### 文件级（Module_Comment）

- 用 1 段前置注释回答：这个文件“做什么/边界是什么/与上下游如何连接”。
- 不在文件头堆叠大段流程说明；细节靠近实现处写。

### 函数级（短职责）

- 只写职责，不写步骤：默认 1 句，必要时最多 2 句。
- 避免把 `if/for/switch` 的分支展开写到函数头；需要说明时放到对应语句块之前。
- 函数职责注释必须使用 TSDoc（`/** ... */`），并在有参数/返回值时补齐 `@param`/`@returns`；若注释中包含 `@public`/`@beta` 等标签，必须保留（不要删掉）。

### 语句块级（靠近关键控制流）

- 对 `Critical_Block` 用前置注释说明“为什么这么做/策略是什么/回退路径是什么”。

## Validation

### 建议验证方式

1. **人工复核**（抽样）：无行尾注释；中文；无逻辑改动；关键分支/循环无遗漏；函数职责注释不啰嗦。
2. **相关测试**：按目录选择对应 `test/<domain>/**` 跑一小组用例。

### 测试命令示例

```bash
pnpm run test test/reactivity/reactive.test.ts
pnpm run test test/runtime-core/renderer/container-key.test.ts
pnpm run test test/runtime-dom/app/create-app.test.tsx
```

## Failure Conditions

- 修改了未被点名的文件
- 改变了业务逻辑、函数签名或执行路径
- 遗漏了任何需要读者思考才能理解的语句块的注释
- 保留了与当前逻辑不匹配的过时注释
- 函数声明前注释冗长且未将细节下沉到函数体内部
- 删除了既有的 `@public`/`@beta` 等 TSDoc 标签，导致 API Extractor 无法正确识别
- 使用了行尾注释或非中文注释
