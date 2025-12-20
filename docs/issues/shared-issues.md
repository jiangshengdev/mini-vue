# Shared 模块问题记录

## 1. 测试修改全局对象（待优化）

- 位置：`test/shared/error-channel.test.ts`
- 现状：修改 `globalThis.queueMicrotask` 进行 spy。
- 影响：虽然在 `finally` 中恢复了，但在并发测试环境下修改全局对象存在风险。
- 提示：建议使用 `vi.spyOn` 或 Vitest 提供的 timer 控制能力，避免直接替换全局方法。
