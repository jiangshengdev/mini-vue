# Implementation Plan: src-code-review

## Overview

按模块化方式执行 `src/` 目录的代码审查，每个任务对应一个审查单元，最后生成汇总报告。

## Tasks

- [ ] 1. 初始化审查报告目录和模板文件
  - 创建 `docs/reviews/` 目录
  - 为每个审查单元创建初始报告文件（状态标记为"待审查"）
  - 创建汇总报告初始文件
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 2. 审查 jsx-foundation 子文件夹
  - [ ] 2.1 读取 `src/jsx-foundation/` 下所有 TypeScript 文件
  - [ ] 2.2 分析文件的 import 依赖
  - [ ] 2.3 执行代码审查，记录问题
  - [ ] 2.4 更新 `docs/reviews/jsx-foundation.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 3. 审查 jsx-runtime 子文件夹
  - [ ] 3.1 读取 `src/jsx-runtime/` 下所有 TypeScript 文件
  - [ ] 3.2 分析文件的 import 依赖
  - [ ] 3.3 执行代码审查，记录问题
  - [ ] 3.4 更新 `docs/reviews/jsx-runtime.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 4. 审查 messages 子文件夹
  - [ ] 4.1 读取 `src/messages/` 下所有 TypeScript 文件
  - [ ] 4.2 分析文件的 import 依赖
  - [ ] 4.3 执行代码审查，记录问题
  - [ ] 4.4 更新 `docs/reviews/messages.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 5. 审查 reactivity 子文件夹
  - [ ] 5.1 读取 `src/reactivity/` 下所有 TypeScript 文件
  - [ ] 5.2 分析文件的 import 依赖
  - [ ] 5.3 执行代码审查，记录问题
  - [ ] 5.4 更新 `docs/reviews/reactivity.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 6. 审查 router 子文件夹
  - [ ] 6.1 读取 `src/router/` 下所有 TypeScript 文件
  - [ ] 6.2 分析文件的 import 依赖
  - [ ] 6.3 执行代码审查，记录问题
  - [ ] 6.4 更新 `docs/reviews/router.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. 审查 runtime-core 子文件夹
  - [ ] 7.1 读取 `src/runtime-core/` 下所有 TypeScript 文件
  - [ ] 7.2 分析文件的 import 依赖
  - [ ] 7.3 执行代码审查，记录问题
  - [ ] 7.4 更新 `docs/reviews/runtime-core.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 8. 审查 runtime-dom 子文件夹
  - [ ] 8.1 读取 `src/runtime-dom/` 下所有 TypeScript 文件
  - [ ] 8.2 分析文件的 import 依赖
  - [ ] 8.3 执行代码审查，记录问题
  - [ ] 8.4 更新 `docs/reviews/runtime-dom.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 9. 审查 shared 子文件夹
  - [ ] 9.1 读取 `src/shared/` 下所有 TypeScript 文件
  - [ ] 9.2 分析文件的 import 依赖
  - [ ] 9.3 执行代码审查，记录问题
  - [ ] 9.4 更新 `docs/reviews/shared.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 10. 审查顶级文件组
  - [ ] 10.1 读取 `src/` 下的顶级 TypeScript 文件（index.ts, jsx-dev-runtime.ts, jsx-runtime.ts, jsx-shim.d.ts, vite-env.d.ts）
  - [ ] 10.2 分析文件的 import 依赖
  - [ ] 10.3 执行代码审查，记录问题
  - [ ] 10.4 更新 `docs/reviews/top-level-files.md` 报告
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 11. 生成汇总报告
  - [ ] 11.1 收集所有审查报告的统计数据
  - [ ] 11.2 更新 `docs/reviews/summary.md` 汇总报告
  - [ ] 11.3 验证所有报告链接正确
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

## Notes

- 每个审查任务遵循 `.github/prompts/inspect.prompt.md` 中定义的审查规则
- 审查时先读取文件的 import 依赖，再分析代码问题
- 每个审查单元最多记录 5 条问题，按严重程度排序
- 仅输出问题描述，不提供修复方案
