# Requirements Document

## Introduction

为提升 mini-vue 源码可读性与维护效率，需要在不改变任何运行时行为的前提下，为 `src` 下的核心逻辑补充中文前置注释，覆盖函数职责、接口/类字段含义、以及关键控制流的意图说明。

本需求以 `.github/prompts/annotation.prompt.md` 为唯一权威规则来源。

## Glossary

- **Annotation_System**: 负责为源码添加中文前置注释的工具/流程
- **Target_File**: 在任务中被显式点名、允许修改的源码文件
- **Leading_Comment**: 位于代码行上方的注释（前置注释），包括 `/** */`、`/* */`、`//` 形式
- **Trailing_Comment**: 位于代码行末尾的注释（行尾注释），本规范禁止使用
- **Critical_Block**: 需要读者推理才能理解的分支/循环/策略性代码块

## Requirements

### Requirement 1: 模块职责与边界说明

**User Story:** As a 仓库读者（学习/维护者）, I want 每个模块的关键入口与核心逻辑都有明确的职责和边界说明, so that 我能在较少跳转的情况下把握整体数据流。

#### Acceptance Criteria

1. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 在关键函数声明上方提供中文职责注释
2. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 在关键类型声明上方提供中文职责注释
3. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 在关键类声明上方提供中文职责注释
4. WHEN 代码存在 Critical_Block THEN THE Annotation_System SHALL 在该代码块之前提供解释意图与策略的 Leading_Comment

### Requirement 2: 接口与类字段含义清晰

**User Story:** As a 使用/扩展框架实现的维护者, I want interface 与类属性都附带含义说明, so that 降低误用字段导致的行为偏差。

#### Acceptance Criteria

1. WHEN 存在 interface 声明 THEN THE Annotation_System SHALL 为 interface 本身添加中文 Leading_Comment
2. WHEN 存在 interface 声明 THEN THE Annotation_System SHALL 为 interface 的每个属性添加中文 Leading_Comment
3. WHEN 存在类属性（含 static/getter/setter）THEN THE Annotation_System SHALL 为每个属性添加中文 Leading_Comment，说明其作用与依赖关系

### Requirement 3: 注释一致性与代码结构保护

**User Story:** As a 代码评审者, I want 新增注释遵循统一规则且不引入噪音式改动, so that review 能聚焦在注释准确性上。

#### Acceptance Criteria

1. WHEN 添加注释 THEN THE Annotation_System SHALL 仅使用 Leading_Comment（禁止 Trailing_Comment）
2. WHEN 添加注释 THEN THE Annotation_System SHALL 使用中文作为注释语言
3. WHEN 文件已有准确注释 THEN THE Annotation_System SHALL 不重复添加相同内容
4. IF 现有注释不准确 THEN THE Annotation_System SHALL 修正注释以贴合真实逻辑
5. WHEN 进行注释补全 THEN THE Annotation_System SHALL 不改变任何业务逻辑、函数签名或执行路径
6. WHEN 进行注释补全 THEN THE Annotation_System SHALL 尽量保持原有空行结构

### Requirement 4: 文件修改范围控制

**User Story:** As a 项目维护者, I want 注释补全只修改被明确指定的文件, so that 变更范围可控、易于审查。

#### Acceptance Criteria

1. THE Annotation_System SHALL 只修改任务中显式点名的 Target_File
2. THE Annotation_System SHALL 不修改未被点名的文件
3. WHEN 开始每个目录任务 THEN THE Annotation_System SHALL 先读取仓库既有注释示例文件（`src/runtime-core/create-app.ts`、`src/runtime-core/renderer.ts`）

### Requirement 5: 注释覆盖完整性

**User Story:** As a 代码阅读者, I want 所有需要理解的代码块都有注释, so that 不会因遗漏而产生理解障碍。

#### Acceptance Criteria

1. WHEN Target_File 中存在需要读者思考才能理解的语句块 THEN THE Annotation_System SHALL 为其添加 Leading_Comment
2. IF 任何 Critical_Block 缺失注释 THEN THE Annotation_System SHALL 视为任务失败
