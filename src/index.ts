/**
 * 暴露核心响应式与 JSX 运行时能力，供外部统一引入。
 */
export { reactive, effect } from './reactivity/index.ts'
export { createApp } from './jsx/index.ts'
export type { ComponentType } from './jsx/index.ts'
