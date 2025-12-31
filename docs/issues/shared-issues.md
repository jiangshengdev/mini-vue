# Shared 模块问题记录

## 1. 测试修改全局对象（状态：已解决）

- 位置：`test/shared/error-channel.test.ts`
- 修复：使用 `vi.stubGlobal('queueMicrotask', ...)`（封装为 `stubGlobalQueueMicrotask()`）替代直接覆盖全局方法，并依赖 `test/setup.ts` 的 `vi.unstubAllGlobals()` 在 `afterEach` 自动恢复。
- 收益：避免全局对象写入带来的并发串扰风险，减少手写 try/finally 样板。
