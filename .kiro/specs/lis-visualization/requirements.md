# Requirements Document

## Introduction

为 LIS（最长递增子序列）算法提供交互式可视化功能，类似于 React Internals Explorer 的设计理念。该功能作为独立模块放置在 `playground/` 目录下，依赖但不修改 `src/` 中的核心算法。允许开发者通过浏览器界面逐步执行算法、观察每一步的状态变化，并支持前进/后退导航，帮助深入理解贪心 + 二分算法的决策过程。

## Glossary

- **LIS_Algorithm**: 最长递增子序列算法，使用贪心 + 二分策略计算输入数组的最长递增子序列索引。
- **Visualization_Step**: 算法执行过程中的单个步骤快照，包含当前状态和决策信息。
- **Sequence_State**: 算法中间状态，包含当前递增序列和前驱数组。
- **Step_Action**: 每一步的操作类型，如"追加"、"替换"或"跳过"。
- **Trace_Result**: 可视化追踪的完整结果，包含所有步骤和最终 LIS。
- **Step_Navigator**: 步骤导航器，支持前进、后退、跳转到指定步骤。
- **Visualization_Component**: 可视化 UI 组件，将步骤状态渲染为交互式界面。

## Requirements

### Requirement 1: 步骤追踪

**User Story:** As a developer, I want to trace each step of the LIS algorithm, so that I can understand how the algorithm makes decisions at each iteration.

#### Acceptance Criteria

1. WHEN the visualization function is called with an input array, THE LIS_Algorithm SHALL record each iteration as a Visualization_Step
2. WHEN a value is appended to the sequence, THE Visualization_Step SHALL indicate the action as "append" with the appended index
3. WHEN a value replaces an existing position, THE Visualization_Step SHALL indicate the action as "replace" with the replaced position and new index
4. WHEN a value is skipped (value is -1), THE Visualization_Step SHALL indicate the action as "skip"
5. THE Visualization_Step SHALL include the current sequence state after the action
6. THE Visualization_Step SHALL include the current predecessors array after the action

### Requirement 2: 状态快照

**User Story:** As a developer, I want to see the complete state at each step, so that I can verify the algorithm's correctness.

#### Acceptance Criteria

1. WHEN a Visualization_Step is recorded, THE LIS_Algorithm SHALL capture a deep copy of the current sequence array
2. WHEN a Visualization_Step is recorded, THE LIS_Algorithm SHALL capture a deep copy of the current predecessors array
3. WHEN a Visualization_Step is recorded, THE LIS_Algorithm SHALL include the current index being processed
4. WHEN a Visualization_Step is recorded, THE LIS_Algorithm SHALL include the current value at that index

### Requirement 3: 追踪结果

**User Story:** As a developer, I want to get the complete trace result, so that I can analyze the full execution history.

#### Acceptance Criteria

1. WHEN the visualization completes, THE Trace_Result SHALL include all Visualization_Steps in order
2. WHEN the visualization completes, THE Trace_Result SHALL include the final LIS result
3. WHEN the visualization completes, THE Trace_Result SHALL include the original input array
4. THE Trace_Result SHALL be serializable to JSON for logging or display purposes

### Requirement 4: 步骤导航

**User Story:** As a developer, I want to navigate through algorithm steps interactively, so that I can explore the execution at my own pace.

#### Acceptance Criteria

1. WHEN using the Step_Navigator, THE user SHALL be able to move to the next step
2. WHEN using the Step_Navigator, THE user SHALL be able to move to the previous step
3. WHEN using the Step_Navigator, THE user SHALL be able to jump to a specific step by index
4. WHEN using the Step_Navigator, THE user SHALL be able to reset to the initial state (step 0)
5. WHEN at the first step, THE Step_Navigator SHALL indicate that previous navigation is unavailable
6. WHEN at the last step, THE Step_Navigator SHALL indicate that next navigation is unavailable
7. THE Step_Navigator SHALL provide the current step index and total step count

### Requirement 5: DOM 可视化界面

**User Story:** As a developer, I want to see an interactive visual representation in the browser, so that I can explore the algorithm with a graphical interface.

#### Acceptance Criteria

1. WHEN the visualization page loads, THE Visualization_Component SHALL display the input array as a row of boxes with values
2. WHEN a step is active, THE Visualization_Component SHALL highlight the current index being processed
3. WHEN a step is active, THE Visualization_Component SHALL display the sequence state with visual connections to show predecessors
4. WHEN a step is active, THE Visualization_Component SHALL display the action taken (append/replace/skip) with relevant details
5. WHEN navigating between steps, THE Visualization_Component SHALL animate transitions smoothly
6. WHEN the final result is displayed, THE Visualization_Component SHALL highlight the LIS elements in the original array

### Requirement 6: 输入编辑

**User Story:** As a developer, I want to edit the input array, so that I can test the algorithm with different inputs.

#### Acceptance Criteria

1. WHEN the user edits the input field, THE Visualization_Component SHALL parse the new input and regenerate the trace
2. WHEN the input is invalid, THE Visualization_Component SHALL display an error message and keep the previous state
3. WHEN the input changes, THE Visualization_Component SHALL reset to step 0

### Requirement 7: 与现有 API 兼容

**User Story:** As a developer, I want the visualization to be independent from the core library, so that production code remains unchanged.

#### Acceptance Criteria

1. THE existing `computeLongestIncreasingSubsequence` function in `src/` SHALL remain unchanged in signature and behavior
2. THE visualization module SHALL be placed in `playground/` directory, separate from `src/`
3. THE visualization module SHALL import and use the original LIS function from `@/runtime-core`
4. WHEN the visualization function is called, THE result SHALL include the same LIS output as the original function
