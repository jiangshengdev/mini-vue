# Implementation Plan: Src 代码注释补全

## Overview

按 `src` 一级子目录拆分任务，每个目录为一个独立任务单元。执行时需显式列出「本次点名要改的文件清单」，以满足注释 agent 的范围约束。

## Tasks

- [x] 1. 准备与对齐
  - [x] 1.1 阅读既有注释示例并抽取风格基线
    - 必读文件：`src/runtime-core/create-app.ts`、`src/runtime-core/renderer.ts`
    - 输出：确认注释语气/措辞、块注释与行注释的使用习惯、对「关键逻辑块」的划分粒度
    - _Requirements: 4.3_

  - [ ] 1.2 建立目录级文件清单生成方式
    - 约束：只允许修改被点名文件
    - 输出：为后续每个目录任务准备一份「待注释文件列表」
    - _Requirements: 4.1, 4.2_

- [x] 2. 注释补全：jsx-foundation
  - [x] 2.1 为 `src/jsx-foundation/**` 补充注释
    - 重点：VNode 工厂、children 归一化、类型与边界假设
    - 验收：工厂函数与关键归一化分支/循环均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

- [x] 3. 注释补全：jsx-runtime
  - [x] 3.1 为 `src/jsx-runtime/**` 补充注释
    - 重点：`jsx/jsxs/jsxDEV/h` 的职责差异、开发态信息处理与封装层次
    - 验收：所有导出函数与内部关键分支均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

- [x] 4. 注释补全：messages
  - [x] 4.1 为 `src/messages/**` 补充注释
    - 重点：文案分层、导出策略、不同子域消息的组织方式
    - 验收：索引聚合与各消息文件的职责清晰；避免重复性注释
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

- [x] 5. 注释补全：reactivity
  - [x] 5.1 为 `src/reactivity/**` 补充注释
    - 重点：依赖收集/触发、effect 生命周期、清理与嵌套 effect、ref/computed/watch 的时序
    - 验收：关键算法路径（track/trigger、scheduler、cleanup、watch flush 策略等）均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 6. 注释补全：router
  - [x] 6.1 为 `src/router/**` 补充注释
    - 重点：路径归一化、导航状态机、`RouterLink/RouterView` 渲染与依赖
    - 验收：导航流程关键分支与组件渲染连接点均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

- [x] 7. 注释补全：runtime-core
  - [x] 7.1 为 `src/runtime-core/**` 补充注释
    - 重点：VNode/组件实例关系、mount/patch、provide/inject、错误处理通道
    - 验收：组件挂载/更新的关键控制流（含异常回退路径）均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 8. 注释补全：runtime-dom
  - [x] 8.1 为 `src/runtime-dom/**` 补充注释
    - 重点：DOM 宿主 glue、props 映射、事件与属性移除策略、class/style 归一化
    - 验收：宿主契约与关键 DOM 操作策略均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

- [x] 9. 注释补全：shared
  - [x] 9.1 为 `src/shared/**` 补充注释
    - 重点：跨子域工具、错误通道、环境检测、注入/插件机制
    - 验收：错误处理链路与注入机制的关键分支/依赖均有前置中文注释
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2_

- [ ] 10. 抽样复核与验证
  - [ ] 10.1 抽样复核（每目录至少 1 个核心文件）
    - Checklist：无行尾注释；中文；无逻辑变更；关键分支/循环无遗漏；不堆叠块注释
    - _Requirements: 3.1, 3.2, 3.5, 5.1, 5.2_

  - [ ] 10.2 运行相关测试以降低误改风险
    - 建议：按目录选择对应 `test/<domain>/**` 运行，而非全量测试
    - 说明：注释改动理论上不影响行为，但跑测试可防止误触代码结构/编辑器自动改写等问题
    - _Requirements: 3.5_

## Notes

- 本 spec 为文档/注释工作，不涉及功能代码实现，因此不包含 Property-Based Testing 任务
- 每个目录任务开始前必须先读取仓库既有注释示例文件
- 验证方式为人工复核 Checklist + 运行相关测试
