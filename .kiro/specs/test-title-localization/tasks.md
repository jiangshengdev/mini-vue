# Implementation Plan: 测试标题中文化

## Overview

按测试子域分批将英文测试标题转换为中文，每批修改后运行测试验证。

## Tasks

- [x] 1. 中文化 router 测试标题
  - [x] 1.1 中文化 `test/router/navigate.test.tsx`
    - 将 describe 和 it 的英文标题翻译为中文
    - 保持术语原样，只翻译描述性文字
    - _Requirements: 2.1, 2.2, 4.3_
  - [x] 1.2 中文化 `test/router/normalize-path.test.tsx`
    - 将 describe 和 it 的英文标题翻译为中文
    - _Requirements: 2.1, 2.2, 4.3_

- [x] 2. 中文化 runtime-core/patch 测试标题
  - [x] 2.1 中文化 `test/runtime-core/patch/insertion.test.ts`
    - 将 describe 和 it 的英文标题翻译为中文
    - _Requirements: 2.1, 2.2, 4.4_
  - [x] 2.2 中文化 `test/runtime-core/patch/runtime-metadata.test.ts`
    - 将 describe 和 it 的英文标题翻译为中文
    - _Requirements: 2.1, 2.2, 4.4_

- [x] 3. 中文化 runtime-core/renderer 测试标题
  - [x] 3.1 中文化 `test/runtime-core/renderer/container-key.test.ts`
    - 将 describe 和 it 的英文标题翻译为中文
    - _Requirements: 2.1, 2.2, 4.4_

- [x] 4. 中文化 runtime-dom/component 测试标题
  - [x] 4.1 中文化 `test/runtime-dom/component/component.test.tsx` 中的英文标题
    - 只有一个英文 it 标题需要翻译
    - _Requirements: 2.1, 2.2, 4.5_

- [x] 5. 中文化 runtime-dom/error 测试标题
  - [x] 5.1 中文化 `test/runtime-dom/error/basic.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 5.2 中文化 `test/runtime-dom/error/nested.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 5.3 中文化 `test/runtime-dom/error/fragment.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_

- [x] 6. 中文化 runtime-dom/render 测试标题
  - [x] 6.1 中文化 `test/runtime-dom/render/basic.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 6.2 中文化 `test/runtime-dom/render/boolean.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 6.3 中文化 `test/runtime-dom/render/children.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 6.4 中文化 `test/runtime-dom/render/fragment.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_
  - [x] 6.5 中文化 `test/runtime-dom/render/fragment-child-anchor.test.tsx` 的 describe 标题
    - _Requirements: 2.1, 2.2, 4.5_

- [x] 7. Checkpoint - 运行测试验证
  - 运行 `pnpm test` 确保所有测试通过
  - 如有问题，检查是否意外修改了代码逻辑

## Notes

- 技术术语保持英文原样（render、mount、component、effect 等）
- 只翻译描述性文字
- 每个任务完成后建议运行测试验证
