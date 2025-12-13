# Reactivity 模块问题记录

## 1. 数组变异方法尚未对依赖做专门处理（待迭代）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状：`push`/`pop`/`splice` 等原型方法仍走默认的 `set`/`length` 联动路径，虽然大多数场景可以触发 effect，但缺少 Vue 式的“写入 length 不触发双重依赖”“`push` 自动把新增索引视为 `ADD`”等精细控制，复杂场景（例如同帧多次 `push` 或自定义调度器）会产生多余触发。
- 下一步：为数组方法注入专用分支，确保 `push`/`unshift` 等操作一次性触发 `length` 与新增索引，`splice`、`sort` 等批量修改可以复用统一的 `triggerOpTypes`，必要时为 `Instrumentations` 新建 helper，与 Vue 3 类似。
- 测试建议：在 `test/reactivity/effect.test.ts` 增补 `push`/`splice`/`sort` 的回归用例，验证依赖仅触发一次、索引与长度同步更新。
