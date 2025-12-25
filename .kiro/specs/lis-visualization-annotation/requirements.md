# Requirements Document

## Introduction

为 `playground/views/lis-visualization/` 目录下的所有源码文件添加描述性的、以逻辑为核心的中文代码注释。注释风格需与仓库现有注释（如 `src/runtime-core/create-app.ts`、`src/runtime-core/renderer.ts`）保持一致，帮助读者快速理解 LIS 算法可视化模块的核心逻辑、边界假设和调用关系。

## Glossary

- **Annotation_Agent**: 注释代理，负责为指定文件添加代码注释的工具。
- **Target_File**: 目标文件，需要添加注释的源码文件。
- **Block_Comment**: 块注释，使用 `/** ... */` 或 `/* ... */` 形式的多行注释。
- **Line_Comment**: 行注释，使用 `//` 形式的单行注释。
- **Front_Comment**: 前置注释，位于代码行之上的注释。

## Requirements

### Requirement 1: 注释形式规范

**User Story:** As a developer, I want consistent comment formatting, so that the codebase maintains a unified style.

#### Acceptance Criteria

1. THE Annotation_Agent SHALL only use front block/line comments (above the code line)
2. THE Annotation_Agent SHALL NOT use inline comments (at the end of code lines)
3. WHEN commenting exported functions, types, or large logic blocks, THE Annotation_Agent SHALL prefer `/** ... */` multi-line comment format
4. WHEN commenting internal logic branches or loops, THE Annotation_Agent SHALL use `/* ... */` single-block comments

### Requirement 2: 注释语言和风格

**User Story:** As a developer, I want comments in Chinese that match the repository conventions, so that the documentation is consistent.

#### Acceptance Criteria

1. THE Annotation_Agent SHALL write all comments in Simplified Chinese
2. THE Annotation_Agent SHALL capitalize the first letter of comment sentences
3. WHEN referencing code identifiers or API names, THE Annotation_Agent SHALL wrap them in backticks
4. THE Annotation_Agent SHALL match the tone and wording style of existing comments in `src/runtime-core/create-app.ts` and `src/runtime-core/renderer.ts`

### Requirement 3: 函数注释要求

**User Story:** As a developer, I want all functions to have clear responsibility comments, so that I can understand their purpose quickly.

#### Acceptance Criteria

1. WHEN a function is declared (global function, class method, or object literal function), THE Annotation_Agent SHALL add a responsibility comment before the declaration
2. THE function comment SHALL describe the function's overall responsibility
3. THE function comment SHALL NOT include implementation details (those belong inside the function body)
4. WHEN a function has complex internal logic, THE Annotation_Agent SHALL add inline front comments before relevant code blocks

### Requirement 4: 接口和类型注释要求

**User Story:** As a developer, I want all interfaces and their properties documented, so that I understand the data structures.

#### Acceptance Criteria

1. WHEN an interface is declared, THE Annotation_Agent SHALL add a front comment explaining the interface's responsibility
2. WHEN an interface property is declared, THE Annotation_Agent SHALL add a front comment explaining the property's meaning or purpose
3. WHEN a class property is declared (instance, static, getter/setter), THE Annotation_Agent SHALL add a front comment explaining its role

### Requirement 5: 逻辑块注释要求

**User Story:** As a developer, I want complex logic blocks explained, so that I can understand the code flow.

#### Acceptance Criteria

1. WHEN a code block requires thought to understand (conditionals, loops, dependent operations), THE Annotation_Agent SHALL add a front comment
2. THE comment SHALL explain the intent, not repeat the code's surface semantics
3. WHEN logic is complex, THE Annotation_Agent MAY write 2-3 lines of comments listing key steps
4. WHEN logic is simple, THE Annotation_Agent SHALL write only one summary sentence

### Requirement 6: 注释粒度和重复性

**User Story:** As a developer, I want appropriate comment density without redundancy, so that comments add value.

#### Acceptance Criteria

1. THE Annotation_Agent SHALL NOT add comments to simple constants or import statements unless necessary
2. IF an existing comment is clear and accurate, THE Annotation_Agent SHALL NOT duplicate it
3. IF an existing comment is inaccurate, THE Annotation_Agent SHALL modify it to match the actual logic
4. THE Annotation_Agent SHALL NOT stack multiple block comments above the same code; information SHALL be merged into a single comment

### Requirement 7: 代码完整性约束

**User Story:** As a developer, I want the annotation process to preserve code functionality, so that the code still works correctly.

#### Acceptance Criteria

1. THE Annotation_Agent SHALL NOT change business logic, function signatures, or execution paths
2. THE Annotation_Agent SHALL NOT delete valid existing comments unless correcting content
3. THE Annotation_Agent SHALL preserve existing statement order and blank line structure
4. THE annotated files SHALL pass format checks (if repository has such constraints)

### Requirement 8: 目标文件范围

**User Story:** As a developer, I want only the specified files to be modified, so that unrelated code remains unchanged.

#### Acceptance Criteria

1. THE Annotation_Agent SHALL only process files in `playground/views/lis-visualization/` directory
2. THE Annotation_Agent SHALL NOT modify files outside the specified directory
3. THE Target_Files SHALL include:
   - `types.ts` - 核心类型定义
   - `trace.ts` - 追踪函数实现
   - `navigator.ts` - 步骤导航器
   - `index.tsx` - 主页面组件
   - `controllers/*.ts` - 控制器模块
   - `handlers/*.ts` - 事件处理器模块
   - `utils/*.ts` - 工具函数模块
   - `components/*.tsx` - UI 组件
   - `components/sequence-graph/*.tsx` - 序列图子组件

### Requirement 9: 清理无效注释

**User Story:** As a developer, I want orphaned comments removed, so that the codebase doesn't have misleading documentation.

#### Acceptance Criteria

1. WHEN a comment references code that no longer exists, THE Annotation_Agent SHALL remove the orphaned comment
2. WHEN a comment describes functionality that has been deleted, THE Annotation_Agent SHALL remove the comment
3. THE Annotation_Agent SHALL identify comments that reference non-existent variables, functions, or types

### Requirement 10: 更新过期注释

**User Story:** As a developer, I want outdated comments updated, so that the documentation reflects the current code behavior.

#### Acceptance Criteria

1. WHEN a comment describes behavior that differs from the actual code, THE Annotation_Agent SHALL update the comment to match the code
2. WHEN a comment references renamed identifiers, THE Annotation_Agent SHALL update the identifier names in the comment
3. WHEN a comment describes an outdated algorithm or approach, THE Annotation_Agent SHALL update it to reflect the current implementation
4. THE Annotation_Agent SHALL verify that each comment accurately describes its associated code
