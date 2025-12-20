# Implementation Plan: VirtualNode Diff / Patch

## Overview

本实现计划将 VirtualNode patch 能力分阶段引入 mini-vue，从宿主原语补齐开始，逐步实现 Text/Element patch、children diff、组件子树 patch。每个阶段都有可验证的测试，确保增量进展。

## Tasks

- [x] 1. 宿主原语补齐（Text patch 前置）
  - [x] 1.1 扩展 RendererOptions：新增 setText
    - 在 `src/runtime-core/renderer.ts` 接口中增加 `setText(node, text)`
    - TypeScript 编译通过
    - _Requirements: 10.1_
  - [x] 1.2 DOM 宿主实现 setText
    - 在 `src/runtime-dom/renderer-options.ts` 实现 `node.nodeValue = text`
    - _Requirements: 10.2_
  - [x]\* 1.3 编写 setText 单元测试
    - 验证文本内容更新正确
    - _Requirements: 10.2_

- [x] 2. Props patch 语义升级
  - [x] 2.1 升级 patchProps 签名为 (el, prevProps, nextProps)
    - 修改 `src/runtime-core/renderer.ts` 接口
    - 修改 `src/runtime-dom/patch-props.ts` 实现
    - 更新所有调用点（mount 时传 `undefined, nextProps`）
    - _Requirements: 3.1_
  - [x] 2.2 实现属性移除与 class/style 清空
    - prev 有、next 无的 attr 被移除
    - class/style 从有值变为空时能清空
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  - [x] 2.3 实现事件更新不叠加（invoker 缓存）
    - 为 element 维护 `key -> invoker` 缓存
    - 更新时只替换 invoker 内部引用
    - 移除时调用 removeEventListener
    - _Requirements: 4.1, 4.2, 4.3_
  - [x]\* 2.4 编写 props patch 单元测试
    - 测试属性移除、class/style 清空
    - 测试事件更新只触发最新 handler
    - _Requirements: 3.1, 3.2, 4.1_

- [x] 3. 引入 patch 入口（Text + Element）
  - [x] 3.1 定义 RuntimeVirtualNode 运行时结构
    - 新增 `src/runtime-core/patch/runtime-virtual-node.ts`
    - 包含 el/anchor/component 字段
    - 不修改 jsx-foundation 对外类型
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [x] 3.2 mount 时写入 el 引用
    - 修改 `src/runtime-core/mount/child.ts`
    - 修改 `src/runtime-core/mount/element.ts`
    - 文本和 Element mount 后记录宿主节点引用
    - _Requirements: 9.1_
  - [x] 3.3 实现 patchChild（Text/Element 分支）
    - 新增 `src/runtime-core/patch/child.ts`
    - Text↔Text：调用 setText
    - Element↔Element：patchProps + patchChildren
    - 类型切换：replace（unmount + mount）
    - _Requirements: 1.1, 2.1_
  - [x]\* 3.4 编写 Text/Element patch 属性测试
    - **Property 1: 文本节点复用**
    - **Property 2: 元素节点复用**
    - **Validates: Requirements 1.1, 1.2, 2.1, 2.2**

- [x] 4. Checkpoint - 基础 patch 验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 5. Children patch（无 key）
  - [x] 5.1 实现 patchChildren Phase A（索引对齐）
    - 新增 `src/runtime-core/patch/children.ts`
    - patch 公共长度区间
    - mount 新增尾部、unmount 多余尾部
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 5.2 增加 Fragment/数组 children 边界支持
    - 修改 `src/runtime-core/mount/child.ts` 数组分支
    - 复用 start/end anchors
    - 在边界内执行 children patch
    - _Requirements: 5.1_
  - [x]\* 5.3 编写无 key children patch 属性测试
    - **Property 5: 无 key 子节点索引对齐**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 6. Children patch（有 key）
  - [x] 6.1 实现 keyed diff Phase B（头尾同步 + key map）
    - 新增 `src/runtime-core/patch/keyed-children.ts`
    - 头部同步（从左到右）
    - 尾部同步（从右到左）
    - 中间区间：建立 key→newIndex，遍历 old 做匹配
    - 移动：从后往前 insertBefore
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x]\* 6.2 编写 keyed diff 属性测试
    - **Property 6: Keyed diff 保序与复用**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 7. Checkpoint - Children patch 验证
  - 确保所有测试通过，如有问题请询问用户

- [x] 8. 组件子树 patch
  - [x] 8.1 组件 rerender 改用 patch
    - 修改 `src/runtime-core/component/render-effect.ts`
    - render 成功后对 previousSubTree 与新 subTree 执行 patch
    - 保留更新失败时的回退逻辑
    - _Requirements: 7.1, 8.1, 8.2_
  - [x]\* 8.2 编写组件子树 patch 属性测试
    - **Property 7: 组件子树 patch 复用**
    - **Validates: Requirements 7.1, 7.2**
  - [x]\* 8.3 编写错误隔离单元测试
    - 更新失败不破坏旧 DOM
    - _Requirements: 8.1, 8.2_

- [x] 9. Final checkpoint - 全量验证
  - 确保所有测试通过，如有问题请询问用户

- [ ] 10. 可选优化
  - [ ]\* 10.1 加入 LIS 优化减少移动
    - 对 newIndexToOldIndex 求 LIS
    - 减少 insertBefore 调用次数
    - _Requirements: 6.1_
  - [ ]\* 10.2 root render 走 patch
    - 在 renderer 中保存 root virtualNode
    - render 时执行 patch，仅首次 mount 才 clear
    - _Requirements: 7.1_

## Notes

- 任务标记 `*` 为可选，可跳过以加速 MVP
- 每个任务引用具体 Requirements 以保证可追溯性
- Checkpoint 任务用于增量验证，确保每阶段稳定
- Property tests 验证通用正确性属性，unit tests 验证边界情况
