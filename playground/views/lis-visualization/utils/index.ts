/**
 * LIS 算法可视化 - 工具函数导出
 *
 * 统一导出所有工具函数，方便其他模块导入使用
 */

// Chain 构建工具
export { buildChain, buildAllChains, computeChangedNodesByChain } from './chain-utils.ts'

// 输入处理工具
export type { ParseResult } from './input-utils.ts'
export {
  parseInput,
  deduplicateInput,
  normalizeSequence,
  generateRandomSequence,
} from './input-utils.ts'

// 高亮计算工具
export type {
  HighlightState,
  PredecessorHighlight,
  NodeClassNameOptions,
} from './highlight-utils.ts'
export {
  getHighlightClass,
  getSecondaryHighlightClass,
  getSeqChangeIndicator,
  computeHighlightState,
  computePredecessorHighlight,
  computePredChangeIndicator,
  getNodeClassName,
} from './highlight-utils.ts'
