/**
 * LIS 算法可视化 - 组件导出
 */

// 主组件导出
export { ActionPanel } from './action-panel.tsx'
export type { ActionPanelProps } from './action-panel.tsx'
export { ArrayDisplay } from './array-display.tsx'
export type { ArrayDisplayProps } from './array-display.tsx'
export { InputEditor } from './input-editor.tsx'
export type { InputEditorProps } from './input-editor.tsx'
export { SequenceGraph } from './sequence-graph.tsx'
export type { SequenceGraphProps } from './sequence-graph.tsx'
export { StepControls } from './step-controls.tsx'
export type { StepControlsProps } from './step-controls.tsx'

// SequenceGraph 子组件导出
export {
  renderHighlightedArray,
  SequenceSection,
  PredecessorSection,
  ChainView,
} from './sequence-graph/index.ts'

// SequenceGraph 子组件类型导出
export type {
  HighlightedArrayOptions,
  SequenceSectionProps,
  PredecessorSectionProps,
  ChainViewProps,
} from './sequence-graph/index.ts'
