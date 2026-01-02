/**
 * DOM 表单 `v-model` 子模块共享类型。
 *
 * 仅包含运行时转换内部使用的辅助类型，外部不直接消费。
 */

/**
 * 冲突追踪回调类型。
 *
 * @param key - 与转换逻辑发生冲突的 props 名
 */
export type TrackConflict = (key: string) => void
