# Messages 模块问题记录

## 1. 错误文案未使用简体中文（待修复）

- 位置：`src/messages/shared.ts`
- 现状：`sharedRunnerNoPromise` 的错误提示为英文，违背项目「日志输出统一使用简体中文」约定。
- 影响：用户在收到该错误时语言风格不一致，体验不统一。
- 可能方案：
  - 将文案改为简体中文，并补充对应的测试断言（如 `expect(...).toThrowError(new TypeError('<中文文案>'))`）。
  - 检查其它消息文案，确保统一语言规范。
