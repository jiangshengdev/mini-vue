# Implementation Plan: Test Review Workflow

## Overview

本任务列表定义了测试代码审核流程的执行步骤。每个任务对应一个测试模块的审核，最终生成汇总报告。

审核遵循 `.github/prompts/inspect.prompt.md` 中的规则：

- 分析正确性、可维护性、潜在缺陷
- 忽略风格差异
- 每文件最多 5 条问题
- 问题格式：`- [Severity] 文件:描述`

## Tasks

- [x] 1. 创建审核输出目录
  - 创建 `docs/reviews/` 目录（如不存在）
  - _Requirements: 2.1_

- [x] 2. 审核 jsx-runtime 模块
  - 审核 `test/jsx-runtime/` 下所有文件
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/jsx-runtime.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 3. 审核 reactivity 模块
  - 审核 `test/reactivity/` 下所有文件（含子文件夹 array、effect、effect-scope、ref、watch）
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/reactivity.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 4. 审核 router 模块
  - 审核 `test/router/` 下所有文件（含子文件夹 core）
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/router.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 5. 审核 runtime-core 模块
  - 审核 `test/runtime-core/` 下所有文件（含子文件夹 app、component、mount、patch、provide-inject、renderer）
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/runtime-core.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 6. 审核 runtime-dom 模块
  - 审核 `test/runtime-dom/` 下所有文件（含子文件夹 app、component、context、error、props、ref、render）
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/runtime-dom.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 7. 审核 shared 模块
  - 审核 `test/shared/` 下所有文件
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/shared.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 8. 审核顶级文件模块
  - 审核 `test/helpers.ts`、`test/index.ts`、`test/setup.ts`
  - 先读取每个文件的 import 依赖
  - 生成 `docs/reviews/top-level.md`
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [x] 9. 生成汇总报告
  - 汇总所有模块的审核结果
  - 生成 `docs/reviews/summary.md`
  - 包含：审核概览、问题统计、各模块统计表格、Critical 快速索引、报告链接
  - _Requirements: 3.1, 3.2, 3.3_

## Notes

- 每个审核任务独立执行，遇到错误时记录并继续下一个模块
- 审核报告格式遵循设计文档中定义的 Module Report 结构
- 汇总报告在所有模块审核完成后生成
