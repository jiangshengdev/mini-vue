# Messages 模块问题记录

## 1. 错误文案未使用简体中文（状态：已解决）

- 位置：`src/messages/shared.ts`
- 现状：`sharedRunnerNoPromise` 的错误提示已改为简体中文，遵循统一文案约定。
- 影响：用户接收的错误提示语言一致，避免体验割裂。
- 修复：替换错误文案为中文，并由 `test/shared/error-channel.test.ts` 覆盖 TypeError 消息断言。
