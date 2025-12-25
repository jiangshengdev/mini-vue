# Requirements Document

## Introduction

本文档定义了 `playground/views/lis-visualization/components` 和 `styles` 目录的代码重构需求。这是对之前主组件重构的延续，目标是进一步提高代码的可维护性和可测试性。

当前实现存在以下问题：

1. **`sequence-graph.tsx` 过于庞大**：约 400 行代码，包含多个渲染函数和辅助逻辑，难以维护
2. **工具函数与组件耦合**：`input-editor.tsx` 中的解析、去重、归一化、随机生成逻辑直接写在组件内部，无法独立测试
3. **样式文件过于集中**：单一的 `visualization.module.css` 包含约 700 行样式，所有组件共享，难以定位和修改

重构目标是将大型组件拆分为更小的子组件，提取可复用的工具函数，并按组件组织样式文件。

## Glossary

- **Sequence_Graph**: 序列状态图组件，显示 Sequence State、Predecessors 和 Chain View
- **Sequence_Section**: Sequence State 显示区域子组件
- **Predecessor_Section**: Predecessors 显示区域子组件
- **Chain_View**: Chain View 显示区域子组件
- **Input_Editor**: 输入编辑器组件
- **Input_Utils**: 输入处理工具模块，包含解析、去重、归一化、随机生成函数
- **Component_Styles**: 组件级样式文件

## Requirements

### Requirement 1: 拆分 Sequence Graph 组件

**User Story:** As a developer, I want the sequence graph component to be split into smaller sub-components, so that each part is easier to understand and maintain.

#### Acceptance Criteria

1. THE Sequence_Graph SHALL be refactored to compose three sub-components: Sequence_Section, Predecessor_Section, and Chain_View
2. WHEN Sequence_Section is rendered, it SHALL display the sequence state with previous/current comparison
3. WHEN Predecessor_Section is rendered, it SHALL display the predecessors array with hover highlighting
4. WHEN Chain_View is rendered, it SHALL display all chains with node highlighting
5. THE sub-components SHALL receive props from the parent Sequence_Graph component
6. THE refactored Sequence_Graph SHALL maintain identical visual output to the original

### Requirement 2: 提取 Chain 构建逻辑

**User Story:** As a developer, I want chain building logic to be in a separate utility module, so that it can be tested independently.

#### Acceptance Criteria

1. THE `buildChain` function SHALL be extracted to a utility module
2. THE `buildAllChains` function SHALL be extracted to the same utility module
3. WHEN `buildChain` is called with a start index and predecessors array, it SHALL return the complete chain from root to the start index
4. WHEN `buildAllChains` is called with sequence and predecessors, it SHALL return all chains for the current state
5. THE utility module SHALL export pure functions without side effects

### Requirement 3: 提取输入处理工具函数

**User Story:** As a developer, I want input parsing and generation logic to be in a separate utility module, so that it can be tested and reused.

#### Acceptance Criteria

1. THE Input_Utils module SHALL export a `parseInput` function
2. THE Input_Utils module SHALL export a `deduplicateInput` function
3. THE Input_Utils module SHALL export a `normalizeSequence` function
4. THE Input_Utils module SHALL export a `generateRandomSequence` function
5. WHEN `parseInput` is called with a valid string, it SHALL return a success result with the parsed number array
6. WHEN `parseInput` is called with an invalid string, it SHALL return a failure result with an error message
7. WHEN `deduplicateInput` is called, it SHALL replace duplicate values with -1 while preserving the first occurrence
8. WHEN `normalizeSequence` is called, it SHALL map non-(-1) values to consecutive integers starting from 0
9. WHEN `generateRandomSequence` is called, it SHALL return a random normalized sequence with optional -1 placeholders

### Requirement 4: 按组件拆分样式文件

**User Story:** As a developer, I want styles to be organized by component, so that I can easily find and modify styles for specific components.

#### Acceptance Criteria

1. THE styles directory SHALL contain separate CSS module files for each component
2. WHEN a component is rendered, it SHALL import only its own style module
3. THE shared styles (variables, animations, common utilities) SHALL be in a separate `shared.module.css` file
4. THE component style files SHALL import shared styles as needed
5. THE refactored styles SHALL produce identical visual output to the original

### Requirement 5: 高亮逻辑提取

**User Story:** As a developer, I want highlight class computation logic to be in a utility module, so that it is reusable and testable.

#### Acceptance Criteria

1. THE highlight utility module SHALL export `getHighlightClass` function
2. THE highlight utility module SHALL export `getSecondaryHighlightClass` function
3. THE highlight utility module SHALL export `getSeqChangeIndicator` function
4. THE highlight utility module SHALL export `computeHighlightState` function
5. WHEN highlight functions are called with an action, they SHALL return the appropriate CSS class names
6. THE highlight functions SHALL be pure functions without side effects

### Requirement 6: 组件导出更新

**User Story:** As a developer, I want the component index to export all new sub-components, so that they can be imported from a single location.

#### Acceptance Criteria

1. THE `components/index.ts` SHALL export all new sub-components
2. THE `components/index.ts` SHALL export all component prop types
3. WHEN importing from `components/index.ts`, all public components SHALL be available

### Requirement 7: 向后兼容性

**User Story:** As a user, I want the visualization to work exactly as before after refactoring, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the refactored components are rendered, THE visualization SHALL display identically to the original
2. WHEN hover interactions occur, THE highlighting SHALL match the original behavior
3. WHEN input is edited, THE parsing and validation SHALL behave identically to the original
4. THE existing tests SHALL pass without modification
