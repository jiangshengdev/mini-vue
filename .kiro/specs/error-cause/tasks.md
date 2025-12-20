# Implementation Plan: Error Cause

## Overview

为 mini-vue 框架中缺少 `cause` 属性的错误添加该属性，涉及 router 和 runtime-core 两个模块共 6 个错误抛出点。

## Tasks

- [ ] 1. 为 Router 模块的错误添加 cause
  - [ ] 1.1 修改 `src/router/core/injection.ts` 中 `useRouter()` 的错误
    - 为 `routerNotFound` 错误添加 cause
    - _Requirements: 1.1_
  - [ ] 1.2 修改 `src/router/core/create-router.ts` 中 `install()` 的错误
    - 为 `routerDuplicateInstallOnApp` 错误添加 cause
    - _Requirements: 1.1_
  - [ ]\* 1.3 为 Router 模块的错误添加单元测试
    - 验证 `useRouter()` 错误包含 cause
    - 验证 `router.install()` 重复安装错误包含 cause
    - _Requirements: 1.1_

- [ ] 2. 为 Runtime-Core 模块的错误添加 cause
  - [ ] 2.1 修改 `src/runtime-core/provide-inject.ts` 中的错误
    - 为 `provide()` 的 `runtimeCoreProvideOutsideSetup` 错误添加 cause
    - 为 `inject()` 的 `runtimeCoreInjectOutsideSetup` 错误添加 cause
    - _Requirements: 1.2_
  - [ ] 2.2 修改 `src/runtime-core/renderer.ts` 中的错误
    - 为 `asContainerKey()` 的 `runtimeCoreInvalidContainer` 错误添加 cause
    - _Requirements: 1.2_
  - [ ] 2.3 修改 `src/runtime-core/create-app.ts` 中的错误
    - 为 `app.use()` 的 `runtimeCoreInvalidPlugin` 错误添加 cause
    - _Requirements: 1.2_
  - [ ]\* 2.4 为 Runtime-Core 模块的错误添加单元测试
    - 验证 `provide()` 错误包含 cause
    - 验证 `inject()` 错误包含 cause
    - 验证无效容器错误包含 cause
    - 验证无效插件错误包含 cause
    - _Requirements: 1.2_

- [ ] 3. Checkpoint - 确保所有测试通过
  - 运行 `pnpm run test` 确保所有测试通过
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- cause 值由实现者根据上下文灵活决定，优先选择能帮助调试的信息
