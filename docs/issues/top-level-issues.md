# Top-level 问题记录

## 1. `cleanupTestContainers` 清理策略过于激进（待优化）

- 位置：`test/helpers.ts`
- 现状：`cleanupTestContainers` 使用 `document.body.innerHTML = ''` 进行清理。
- 影响：这是一种非常激进的清理策略，虽然能确保环境清洁，但可能会意外清除那些并非由 `createTestContainer` 创建但本应在测试间持久化的 DOM 元素（如果有的话），或者干扰 Vitest 的环境。
- 提示：建议仅清理 `mountedContainers` 集合中的元素，避免操作整个 body。
