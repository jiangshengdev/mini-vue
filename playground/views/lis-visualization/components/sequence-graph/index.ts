/**
 * SequenceGraph 子组件模块入口。
 *
 * @remarks
 * 导出序列图相关的子组件、工具函数和类型定义：
 * - `renderHighlightedArray`：高亮数组渲染工具
 * - `SequenceSection`：序列状态显示区域
 * - `PredecessorSection`：前驱数组显示区域
 * - `ChainView`：链视图显示区域
 */

export { renderHighlightedArray } from './highlighted-array.tsx'

export { SequenceSection } from './sequence-section.tsx'
export { PredecessorSection } from './predecessor-section.tsx'
export { ChainView } from './chain-view.tsx'

export type { HighlightedArrayOptions } from './highlighted-array.tsx'
export type { SequenceSectionProps } from './sequence-section.tsx'
export type { PredecessorSectionProps } from './predecessor-section.tsx'
export type { ChainViewProps } from './chain-view.tsx'
