# Implementation Plan: Src 代码注释更新

## 必读（强制）

阅读完本文件后，下一步必须继续阅读以下两份文档：

- [requirements.md](./requirements.md)：硬约束与验收口径（含注释标杆目录）
- [design.md](./design.md)：执行流程与验证方式

## Overview

本文件默认是**可复用模板**：执行过程中允许用 `[x]` 记录进度，但提交前需要清空回 `[ ]`。

按 `src` 一级子目录拆分任务，每个目录为一个独立任务单元；具体验收口径以 [requirements.md](./requirements.md) 为准。

## Tasks

- [x] 1. 准备与对齐
  - [x] 1.1 建立目录级点名清单
    - 约束：只允许修改被点名文件
    - 策略：每个目录任务开始时，用 `rg --files src/<子目录>` 或 `find src/<子目录> -type f` 枚举该目录下全部文件，并在任务输入中显式点名这些文件（即本次 Target_File 清单）

- [x] 2. 注释更新：jsx-foundation
  - [x] 2.1 覆盖 `src/jsx-foundation/**` 全部文件
    - 重点：VirtualNode 工厂、children 归一化、类型与边界假设
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`（文件级职责注释 + 每函数短职责 + 关键代码块注释），过时注释已修正

- [ ] 3. 注释更新：jsx-runtime
  - [ ] 3.1 覆盖 `src/jsx-runtime/**` 全部文件
    - 重点：`jsx/jsxs/jsxDEV/h` 的职责差异、开发态信息处理与封装层次
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 4. 注释更新：messages
  - [ ] 4.1 覆盖 `src/messages/**` 全部文件
    - 重点：文案分层、导出策略、不同子域消息的组织方式
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 5. 注释更新：reactivity
  - [ ] 5.1 覆盖 `src/reactivity/**` 全部文件
    - 重点：依赖收集/触发、effect 生命周期、清理与嵌套 effect、ref/computed/watch 的时序
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 6. 注释更新：router
  - [ ] 6.1 覆盖 `src/router/**` 全部文件
    - 重点：路径归一化、导航状态机、`RouterLink/RouterView` 渲染与依赖
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 7. 注释更新：runtime-core
  - [ ] 7.1 覆盖 `src/runtime-core/**` 全部文件
    - 重点：VirtualNode/组件实例关系、mount/patch、provide/inject、错误处理通道
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 8. 注释更新：runtime-dom
  - [ ] 8.1 覆盖 `src/runtime-dom/**` 全部文件
    - 重点：DOM 宿主 glue、props 映射、事件与属性移除策略、class/style 归一化
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 9. 注释更新：shared
  - [ ] 9.1 覆盖 `src/shared/**` 全部文件
    - 重点：跨子域工具、错误通道、环境检测、注入/插件机制
    - 验收：目录内每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 10. 注释更新：src 顶层文件
  - [ ] 10.1 覆盖 `src/*.ts` 顶层文件
    - 重点：框架主入口导出聚合、JSX 运行时入口的生产态/开发态差异
    - 验收：每个文件满足 `.kiro/specs/annotation-src/requirements.md`，过时注释已修正

- [ ] 11. 抽样复核与验证
  - [ ] 11.1 抽样复核（每目录至少 2 个文件：1 个核心文件 + 1 个非核心文件）
    - Checklist：无行尾注释；中文；无逻辑变更；关键分支/循环无遗漏；函数职责注释不啰嗦（细节下沉到函数体内）；无过时注释

  - [ ] 11.2 运行相关测试以降低误改风险
    - 建议：按目录选择对应 `test/<domain>/**` 运行，而非全量测试（参考 `.kiro/specs/annotation-src/design.md` 的示例命令）

  - [ ] 11.3 提交前清理模板状态
    - 要求：提交到仓库时 `.kiro/specs/annotation-src/tasks.md` 保持全部为 `[ ]`

## Notes
- 本任务为注释整改，不涉及功能代码实现。
