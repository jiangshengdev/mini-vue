# Implementation Plan

- [ ] 1. 扩展 RendererOptions 并实现 setText
  - [ ] 1.1 在 RendererOptions 接口中新增 setText 方法
    - 文件：`src/runtime-core/renderer.ts`
    - 添加 `setText(node: HostNode, text: string): void` 到接口定义
    - _Requirements: 6.1_
  - [ ] 1.2 在 runtime-dom 实现 setText
    - 文件：`src/runtime-dom/renderer-options.ts`
    - 实现：`setText(node) { (node as Text).nodeValue = text }`
    - _Requirements: 6.2_
  - [ ] 1.3 编写 setText property test
    - **Property 1: 文本更新保持节点引用**
    - **Validates: Requirements 1.2, 6.1**

- [ ] 2. 升级 patchProps 支持差量更新
  - [ ] 2.1 修改 patchProps 签名为 (el, prevProps, nextProps)
    - 文件：`src/runtime-core/renderer.ts`（接口）、`src/runtime-dom/patch-props.ts`（实现）
    - mount 时调用 `patchProps(el, undefined, nextProps)`
    - _Requirements: 2.4_
  - [ ] 2.2 实现属性移除逻辑
    - 文件：`src/runtime-dom/patch-props.ts`
    - 遍历 prevProps，若 key 不在 nextProps 中则移除
    - 处理 class/style 清空场景
    - _Requirements: 2.2_
  - [ ] 2.3 实现事件 invoker 缓存机制
    - 文件：`src/runtime-dom/patch-props.ts`
    - 为 element 维护 `eventName -> invoker` 缓存
    - 更新时替换 invoker.value，移除时 removeEventListener
    - _Requirements: 2.3_
  - [ ] 2.4 编写 patchProps property tests
    - **Property 3: Props 差量正确应用**
    - **Property 4: 事件更新不叠加**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 3. 引入 RuntimeVNode 与 el 映射
  - [ ] 3.1 定义 RuntimeVNode 类型
    - 文件：新建 `src/runtime-core/vnode.ts`
    - 定义包含 el/anchor/component 的运行时结构
    - 不修改 `src/jsx-foundation/types.ts`
    - _Requirements: 1.1_
  - [ ] 3.2 mount 时写入 el 引用
    - 文件：`src/runtime-core/mount/child.ts`、`src/runtime-core/mount/element.ts`
    - 文本 mount 后记录 TextNode 引用
    - Element mount 后记录 Element 引用
    - _Requirements: 1.1, 1.2_

- [ ] 4. 实现 patchChild 入口（Text + Element）
  - [ ] 4.1 创建 patchChild 函数
    - 文件：新建 `src/runtime-core/patch/index.ts`
    - 实现 same 判定（type + key）
    - 实现 Text↔Text 分支：调用 setText
    - 实现类型切换分支：unmount old + mount new
    - _Requirements: 1.2, 1.3_
  - [ ] 4.2 实现 Element patch 分支
    - 调用 patchProps(el, old.props, new.props)
    - 调用 patchChildren（Phase A）
    - _Requirements: 2.1_
  - [ ] 4.3 编写 patchChild property test
    - **Property 2: 类型切换正确替换**
    - **Validates: Requirements 1.3**

- [ ] 5. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. 实现 patchChildren Phase A（无 key 索引对齐）
  - [ ] 6.1 创建 patchChildren 函数
    - 文件：新建 `src/runtime-core/patch/children.ts`
    - patch 公共长度区间
    - mount 新增尾部
    - unmount 旧的尾部
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 6.2 编写无 key children property test
    - **Property 5: 无 key children 索引对齐复用**
    - **Validates: Requirements 3.1**

- [ ] 7. 实现 Fragment/数组 children 边界支持
  - [ ] 7.1 为数组 children 维护 start/end anchors
    - 文件：`src/runtime-core/mount/child.ts`
    - 在 RuntimeVNode 上记录 anchor 引用
    - _Requirements: 3.1_
  - [ ] 7.2 在 patch 时复用 anchors 边界
    - 文件：`src/runtime-core/patch/children.ts`
    - 在边界内执行 children diff
    - _Requirements: 3.1_

- [ ] 8. 实现 patchChildren Phase B（keyed diff）
  - [ ] 8.1 创建 patchKeyedChildren 函数
    - 文件：新建 `src/runtime-core/patch/keyed-children.ts`
    - 实现头部同步（从左到右）
    - 实现尾部同步（从右到左）
    - _Requirements: 4.1_
  - [ ] 8.2 实现中间区间处理
    - 建立 key → newIndex map
    - 遍历 old 做匹配 patch / unmount
    - 遍历 new mount 不存在的
    - 从后往前 insertBefore 保证顺序
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 8.3 编写 keyed children property test
    - **Property 6: Keyed children 顺序与复用**
    - **Validates: Requirements 4.1, 4.4**

- [ ] 9. Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. 组件更新改用 patch
  - [ ] 10.1 修改 render-effect 使用 patch
    - 文件：`src/runtime-core/component/render-effect.ts`
    - render 成功后：对 previousSubTree 与 instance.subTree 执行 patch
    - 保留更新失败时的"回退 previousSubTree"逻辑
    - _Requirements: 1.1, 5.1_
  - [ ] 10.2 编写错误隔离 property test
    - **Property 7: 错误隔离保持 DOM 状态**
    - **Validates: Requirements 5.1**

- [ ] 11. Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
