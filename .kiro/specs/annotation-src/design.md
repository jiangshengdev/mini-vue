# Design Document

## 必读（强制）

阅读完本文件后，下一步必须继续阅读以下两份文档：

- [requirements.md](./requirements.md)：硬约束与验收口径（含注释标杆目录）
- [tasks.md](./tasks.md)：任务清单与进度记录规则

## Overview

本设计文档只描述执行流程与验证建议；注释覆盖、简洁度、TSDoc 与标杆目录等硬约束以 [requirements.md](./requirements.md) 为准。

## Execution Flow

注释更新采用「按 `src` 一级子目录分批」策略，每个目录为一个任务单元：

1. **准备**：先对齐 [requirements.md](./requirements.md) 的硬约束与注释标杆目录。
2. **点名全量文件**：按 [tasks.md](./tasks.md) 的目录任务列出该目录下全部文件，并在任务输入中显式点名这些 Target_File。
3. **逐文件校正与补齐**：
   - 补齐缺失注释并修正过时注释。
   - 遵循 [requirements.md](./requirements.md) 的覆盖与简洁度要求（函数短职责、细节下沉到关键语句块之前）。
4. **最小验证**：按改动域运行相关测试，降低误改代码结构的风险。
5. **收尾**：按 [tasks.md](./tasks.md) 清理模板状态与进度标记。

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
