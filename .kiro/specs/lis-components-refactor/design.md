# Design Document: LIS Components Refactor

## Overview

本设计文档描述了 `playground/views/lis-visualization/components` 和 `styles` 目录的重构方案。重构的核心思想是将大型组件拆分为更小的子组件，提取可复用的工具函数，并按组件组织样式文件。

重构后的架构遵循单一职责原则，每个组件和工具模块都有明确的职责边界。

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SequenceGraph                            │
│                    (Orchestrator Component)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ SequenceSection  │  │ PredecessorSection│  │ ChainView    │  │
│  │                  │  │                  │  │              │  │
│  │ - 显示 sequence  │  │ - 显示 predecessors│ │ - 显示链视图 │  │
│  │ - 上一步对比     │  │ - hover 高亮      │  │ - 节点高亮   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         Utilities                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ chain-utils.ts   │  │ input-utils.ts   │  │ highlight-   │  │
│  │                  │  │                  │  │ utils.ts     │  │
│  │ - buildChain     │  │ - parseInput     │  │ - getHighlight│ │
│  │ - buildAllChains │  │ - deduplicate    │  │   Class      │  │
│  │                  │  │ - normalize      │  │ - compute... │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 文件结构

```
playground/views/lis-visualization/
├── components/
│   ├── index.ts                    # 组件导出（更新）
│   ├── action-panel.tsx            # 保持不变
│   ├── array-display.tsx           # 保持不变
│   ├── input-editor.tsx            # 简化，使用 input-utils
│   ├── sequence-graph.tsx          # 简化为编排层
│   ├── step-controls.tsx           # 保持不变
│   └── sequence-graph/             # 新增：子组件目录
│       ├── index.ts                # 子组件导出
│       ├── sequence-section.tsx    # 新增：Sequence State 区域
│       ├── predecessor-section.tsx # 新增：Predecessors 区域
│       ├── chain-view.tsx          # 新增：Chain View 区域
│       └── highlighted-array.tsx   # 新增：高亮数组渲染组件
├── utils/                          # 新增：工具函数目录
│   ├── index.ts                    # 工具导出
│   ├── chain-utils.ts              # Chain 构建工具
│   ├── input-utils.ts              # 输入处理工具
│   └── highlight-utils.ts          # 高亮计算工具
├── styles/
│   ├── shared.module.css           # 新增：共享样式（变量、动画）
│   ├── layout.module.css           # 新增：布局样式
│   ├── array-display.module.css    # 新增：数组显示样式
│   ├── sequence-graph.module.css   # 新增：序列图样式
│   ├── action-panel.module.css     # 新增：操作面板样式
│   ├── step-controls.module.css    # 新增：步骤控制样式
│   ├── input-editor.module.css     # 新增：输入编辑器样式
│   └── visualization.module.css    # 保留：兼容性（可选删除）
└── __tests__/
    ├── ... (existing tests)
    ├── chain-utils.test.ts         # 新增
    ├── input-utils.test.ts         # 新增
    └── highlight-utils.test.ts     # 新增
```

## Components and Interfaces

### SequenceSection Component

Sequence State 显示区域子组件。

```typescript
interface SequenceSectionProps {
  /** 输入数组 */
  input: number[]
  /** 当前 sequence */
  sequence: number[]
  /** 上一步 sequence */
  previousSequence?: number[]
  /** 高亮位置 */
  highlightSeqPosition: number
  /** 上一步高亮位置 */
  previousHighlightSeqPosition: number
  /** 前驱值（用于半高亮） */
  predecessorValue?: number
  /** 上一步前驱值 */
  previousPredecessorValue?: number
  /** 高亮类名 */
  highlightClass: string
  /** 半高亮类名 */
  secondaryHighlightClass: string
  /** 变更指示器文本 */
  seqChangeIndicator: string
  /** 鼠标进入回调 */
  onMouseEnter: () => void
  /** 鼠标离开回调 */
  onMouseLeave: () => void
}
```

### PredecessorSection Component

Predecessors 显示区域子组件。

```typescript
interface PredecessorSectionProps {
  /** predecessors 数组 */
  predecessors: number[]
  /** 上一步 predecessors */
  previousPredecessors?: number[]
  /** 高亮索引 */
  highlightPredIndex: number
  /** 高亮类名 */
  highlightClass: string
  /** 变更指示器文本 */
  predChangeIndicator: string
  /** hover 高亮位置列表 */
  hoveredPositions?: number[]
  /** 鼠标进入回调 */
  onMouseEnter: () => void
  /** 鼠标离开回调 */
  onMouseLeave: () => void
}
```

### ChainView Component

Chain View 显示区域子组件。

```typescript
interface ChainViewProps {
  /** 所有链 */
  chains: number[][]
  /** 变更节点映射 */
  changedNodesByChain: Map<number, Set<number>>
  /** 高亮前驱索引 */
  highlightPredIndex: number
  /** 是否为链操作（append/replace） */
  isChainAction: boolean
  /** 高亮类名 */
  highlightClass: string
  /** Sequence 区域是否被 hover */
  isSequenceHovered: boolean
  /** Predecessors 区域是否被 hover */
  isPredecessorsHovered?: boolean
  /** 输入数组 */
  input: number[]
  /** predecessors 数组 */
  predecessors: number[]
  /** 操作类型 */
  actionType?: StepAction['type']
  /** 链 hover 进入回调 */
  onChainHover: (chain: number[], chainIndex: number) => void
  /** 链 hover 离开回调 */
  onChainLeave: () => void
}
```

### HighlightedArray Component

高亮数组渲染组件，用于统一渲染带高亮的数组。

```typescript
interface HighlightedArrayProps {
  /** 数组数据 */
  array: number[]
  /** 主高亮位置 */
  highlightPos: number
  /** 主高亮类名 */
  highlightClass: string
  /** 半高亮值 */
  secondaryHighlightValue?: number
  /** 半高亮类名 */
  secondaryHighlightClass?: string
  /** hover 高亮位置列表 */
  hoveredPositions?: number[]
}
```

## Utility Modules

### chain-utils.ts

Chain 构建工具函数。

```typescript
/**
 * 从指定索引构建完整的前驱链
 * @param startIndex 起始索引
 * @param predecessors 前驱数组
 * @returns 从根到 startIndex 的完整链
 */
function buildChain(startIndex: number, predecessors: number[]): number[]

/**
 * 为 sequence 中的每个元素构建前驱链
 * @param sequence 当前 sequence
 * @param predecessors 前驱数组
 * @returns 所有链的数组
 */
function buildAllChains(sequence: number[], predecessors: number[]): number[][]

/**
 * 计算两个链集合之间的变更节点
 * @param chains 当前链集合
 * @param previousChains 上一步链集合
 * @param isChainAction 是否为链操作
 * @param highlightPredIndex 高亮前驱索引
 * @returns 每条链的变更节点集合
 */
function computeChangedNodesByChain(
  chains: number[][],
  previousChains: number[][] | undefined,
  isChainAction: boolean,
  highlightPredIndex: number,
): Map<number, Set<number>>
```

### input-utils.ts

输入处理工具函数。

```typescript
/** 解析结果类型 */
type ParseResult =
  | { success: true; data: number[] }
  | { success: false; error: string }

/**
 * 解析输入字符串为数字数组
 * @param value 输入字符串（逗号或空格分隔）
 * @returns 解析结果
 */
function parseInput(value: string): ParseResult

/**
 * 去重处理：保留第一次出现的值，后续重复的替换为 -1
 * @param numbers 输入数组
 * @returns 去重后的数组
 */
function deduplicateInput(numbers: number[]): number[]

/**
 * 归一化数组：将非 -1 的值按大小顺序映射为 0, 1, 2, ...
 * @param numbers 输入数组
 * @returns 归一化后的数组
 */
function normalizeSequence(numbers: number[]): number[]

/**
 * 生成随机数字序列（无重复值，已归一化）
 * @returns 随机序列
 */
function generateRandomSequence(): number[]
```

### highlight-utils.ts

高亮计算工具函数。

```typescript
/**
 * 根据操作类型获取主高亮类名
 * @param action 步骤操作
 * @returns CSS 类名
 */
function getHighlightClass(action: StepAction | undefined): string

/**
 * 根据操作类型获取半高亮类名
 * @param action 步骤操作
 * @returns CSS 类名
 */
function getSecondaryHighlightClass(action: StepAction | undefined): string

/**
 * 获取 sequence 变更指示器文本
 * @param action 步骤操作
 * @param hasPrevious 是否有上一步
 * @returns 指示器文本
 */
function getSeqChangeIndicator(action: StepAction | undefined, hasPrevious: boolean): string

/**
 * 计算高亮状态
 * @param action 步骤操作
 * @param sequence 当前 sequence
 * @returns 高亮位置信息
 */
function computeHighlightState(
  action: StepAction | undefined,
  sequence: number[],
): {
  highlightSeqPosition: number
  highlightPredIndex: number
  previousHighlightSeqPosition: number
}

/**
 * 计算前驱高亮信息
 * @param highlightPredIndex 高亮前驱索引
 * @param predecessors 前驱数组
 * @param action 步骤操作
 * @returns 前驱值信息
 */
function computePredecessorHighlight(
  highlightPredIndex: number,
  predecessors: number[],
  action: StepAction | undefined,
): {
  predecessorValue: number | undefined
  previousPredecessorValue: number | undefined
}

/**
 * 计算前驱变更指示器文本
 * @param hasPrevious 是否有上一步
 * @param previousPredecessors 上一步前驱数组
 * @param highlightPredIndex 高亮前驱索引
 * @param predecessors 当前前驱数组
 * @returns 指示器文本
 */
function computePredChangeIndicator(
  hasPrevious: boolean,
  previousPredecessors: number[] | undefined,
  highlightPredIndex: number,
  predecessors: number[],
): string

/**
 * 获取链节点的 CSS 类名
 * @param options 节点状态选项
 * @returns CSS 类名
 */
function getNodeClassName(options: {
  isChainTailHighlight: boolean
  isHighlightNode: boolean
  isChangedNode: boolean
  actionType: StepAction['type'] | undefined
  highlightClass: string
}): string
```

## Data Models

### 现有数据模型（保持不变）

```typescript
/** 步骤操作类型 */
type StepAction =
  | { type: 'init' }
  | { type: 'append'; index: number }
  | { type: 'replace'; position: number; index: number }
  | { type: 'skip'; index: number }
```

### 新增类型定义

```typescript
/** 解析结果类型 */
type ParseResult =
  | { success: true; data: number[] }
  | { success: false; error: string }

/** 高亮状态 */
interface HighlightState {
  highlightSeqPosition: number
  highlightPredIndex: number
  previousHighlightSeqPosition: number
}

/** 前驱高亮信息 */
interface PredecessorHighlight {
  predecessorValue: number | undefined
  previousPredecessorValue: number | undefined
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._


### Property 1: buildChain 返回完整的前驱链

_For any_ valid predecessors array and start index within bounds, when `buildChain(startIndex, predecessors)` is called, the returned chain SHALL:
- Start with a node whose predecessor is -1 (root node)
- End with the start index
- Each consecutive pair (chain[i], chain[i+1]) satisfies predecessors[chain[i+1]] === chain[i]

**Validates: Requirements 2.3**

This property ensures the chain building logic correctly traverses the predecessor links from root to the target node.

### Property 2: buildAllChains 返回正确数量的链

_For any_ sequence array and predecessors array, when `buildAllChains(sequence, predecessors)` is called, the returned chains array SHALL:
- Have length equal to sequence.length
- Each chain[i] ends with sequence[i]

**Validates: Requirements 2.4**

This property ensures that buildAllChains correctly builds a chain for each element in the sequence.

### Property 3: parseInput 解析往返一致性

_For any_ valid number array (containing only integers >= -1), when the array is formatted as a comma-separated string and then parsed with `parseInput`, the result SHALL be a success with data equal to the original array.

**Validates: Requirements 3.5, 3.6**

This is a round-trip property that ensures parsing correctly handles valid input strings.

### Property 4: deduplicateInput 保持首次出现

_For any_ number array, when `deduplicateInput` is called:
- The output length SHALL equal the input length
- For each unique non-(-1) value, its first occurrence position SHALL be preserved
- All subsequent occurrences of the same value SHALL be replaced with -1

**Validates: Requirements 3.7**

This property ensures the deduplication logic correctly identifies and handles duplicate values.

### Property 5: normalizeSequence 映射为连续整数

_For any_ number array, when `normalizeSequence` is called:
- All -1 values SHALL remain as -1
- All non-(-1) values SHALL be mapped to consecutive integers starting from 0
- The relative order of non-(-1) values by their original magnitude SHALL be preserved

**Validates: Requirements 3.8**

This property ensures normalization produces a valid normalized sequence.

### Property 6: generateRandomSequence 返回有效的归一化序列

_For any_ call to `generateRandomSequence`, the returned array SHALL:
- Contain only -1 and non-negative integers
- Have all non-(-1) values form a consecutive sequence from 0 to n-1 (where n is the count of non-(-1) values)
- Have no duplicate non-(-1) values

**Validates: Requirements 3.9**

This property ensures the random generator always produces valid normalized sequences.

### Property 7: 高亮函数纯函数性

_For any_ action input, calling `getHighlightClass(action)` multiple times with the same action SHALL return the same result. The same applies to `getSecondaryHighlightClass`, `getSeqChangeIndicator`, and other highlight utility functions.

**Validates: Requirements 5.5, 5.6**

This property ensures highlight functions are pure and deterministic.

## Error Handling

### Chain Utils Errors

- **Invalid start index**: 如果 `startIndex` 为负数或超出 predecessors 数组范围，`buildChain` 应返回空数组
- **Circular reference**: 如果 predecessors 数组包含循环引用，`buildChain` 应检测并避免无限循环

### Input Utils Errors

- **Invalid characters**: `parseInput` 应返回包含错误信息的失败结果
- **Negative numbers**: 除 -1 外的负数应被拒绝
- **Decimal numbers**: 小数应被拒绝
- **Empty input**: 空字符串应返回空数组

### Highlight Utils Errors

- **Undefined action**: 所有高亮函数应正确处理 `undefined` action，返回默认值

## Testing Strategy

### 单元测试

单元测试用于验证各个工具函数的具体行为和边界条件：

1. **Chain Utils Tests** (`chain-utils.test.ts`)
   - 验证 `buildChain` 基本功能
   - 验证空 predecessors 处理
   - 验证单节点链
   - 验证多节点链

2. **Input Utils Tests** (`input-utils.test.ts`)
   - 验证 `parseInput` 各种输入格式
   - 验证 `deduplicateInput` 边界情况
   - 验证 `normalizeSequence` 边界情况
   - 验证 `generateRandomSequence` 输出格式

3. **Highlight Utils Tests** (`highlight-utils.test.ts`)
   - 验证各操作类型的类名映射
   - 验证 undefined action 处理

### 属性测试

属性测试用于验证通用正确性属性：

1. **Chain Utils Property Tests** (`chain-utils.property.test.ts`)
   - 使用 fast-check 生成随机 predecessors 数组
   - 验证 Property 1 和 Property 2
   - 最少 100 次迭代

2. **Input Utils Property Tests** (`input-utils.property.test.ts`)
   - 使用 fast-check 生成随机数字数组
   - 验证 Property 3、4、5、6
   - 最少 100 次迭代

3. **Highlight Utils Property Tests** (`highlight-utils.property.test.ts`)
   - 使用 fast-check 生成随机 action
   - 验证 Property 7
   - 最少 100 次迭代

### 现有测试兼容性

重构后必须确保以下现有测试继续通过：

- `__tests__/navigator.test.ts` - 导航器单元测试
- `__tests__/navigator.property.test.ts` - 导航器属性测试
- `__tests__/trace.property.test.ts` - 追踪函数属性测试
- `__tests__/state-manager.property.test.ts` - 状态管理器属性测试
- `__tests__/hover-manager.property.test.ts` - Hover 管理器属性测试

### 测试标注格式

每个属性测试必须包含以下注释：

```typescript
/**
 * Feature: lis-components-refactor, Property N: [Property Title]
 * Validates: Requirements X.Y
 */
```
