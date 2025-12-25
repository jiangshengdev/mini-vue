# Requirements Document

## Introduction

mini-vue 源码经过多次迭代，部分注释已无法与当前逻辑匹配。本需求旨在对 `src` 目录下的中文注释进行**校正与更新**，确保注释准确反映代码的真实行为，同时补充缺失的关键注释。

本需求以 `.github/prompts/annotation.prompt.md` 为唯一权威规则来源。

## Glossary

- **Annotation_System**: 负责校正、更新和补充源码中文注释的工具/流程
- **Target_File**: 在任务中被显式点名、允许修改的源码文件
- **Leading_Comment**: 位于代码行上方的注释（前置注释），包括 `/** */`、`/* */`、`//` 形式
- **Trailing_Comment**: 位于代码行末尾的注释（行尾注释），本规范禁止使用
- **Critical_Block**: 需要读者推理才能理解的分支/循环/策略性代码块
- **Stale_Comment**: 与当前代码逻辑不匹配的过时注释

## Requirements

### Requirement 1: 过时注释校正

**User Story:** As a 仓库读者（学习/维护者）, I want 所有注释都准确反映当前代码逻辑, so that 不会被过时注释误导。

#### Acceptance Criteria

1. WHEN 发现 Stale_Comment THEN THE Annotation_System SHALL 修正注释以贴合当前真实逻辑
2. WHEN 注释描述的函数签名/参数/返回值已变更 THEN THE Annotation_System SHALL 更新注释以匹配新签名
3. WHEN 注释描述的控制流/分支逻辑已变更 THEN THE Annotation_System SHALL 更新注释以匹配新逻辑
4. WHEN 注释引用的变量名/函数名已重命名 THEN THE Annotation_System SHALL 更新注释中的引用

### Requirement 2: 模块职责与边界说明

**User Story:** As a 仓库读者（学习/维护者）, I want 每个模块的关键入口与核心逻辑都有明确的职责和边界说明, so that 我能在较少跳转的情况下把握整体数据流。

#### Acceptance Criteria

1. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 确保关键函数声明上方有准确的中文职责注释
2. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 确保关键类型声明上方有准确的中文职责注释
3. WHEN 打开任意 `src/**` 下的核心文件 THEN THE Annotation_System SHALL 确保关键类声明上方有准确的中文职责注释
4. WHEN 代码存在 Critical_Block THEN THE Annotation_System SHALL 确保该代码块之前有解释意图与策略的 Leading_Comment

### Requirement 3: 接口与类字段含义清晰

**User Story:** As a 使用/扩展框架实现的维护者, I want interface 与类属性都附带准确的含义说明, so that 降低误用字段导致的行为偏差。

#### Acceptance Criteria

1. WHEN 存在 interface 声明 THEN THE Annotation_System SHALL 确保 interface 本身有准确的中文 Leading_Comment
2. WHEN 存在 interface 声明 THEN THE Annotation_System SHALL 确保 interface 的每个属性有准确的中文 Leading_Comment
3. WHEN 存在类属性（含 static/getter/setter）THEN THE Annotation_System SHALL 确保每个属性有准确的中文 Leading_Comment

### Requirement 4: 注释一致性与代码结构保护

**User Story:** As a 代码评审者, I want 注释更新遵循统一规则且不引入噪音式改动, so that review 能聚焦在注释准确性上。

#### Acceptance Criteria

1. WHEN 添加或更新注释 THEN THE Annotation_System SHALL 仅使用 Leading_Comment（禁止 Trailing_Comment）
2. WHEN 添加或更新注释 THEN THE Annotation_System SHALL 使用中文作为注释语言
3. WHEN 文件已有准确注释 THEN THE Annotation_System SHALL 不重复添加或修改
4. WHEN 进行注释更新 THEN THE Annotation_System SHALL 不改变任何业务逻辑、函数签名或执行路径
5. WHEN 进行注释更新 THEN THE Annotation_System SHALL 尽量保持原有空行结构

### Requirement 5: 文件修改范围控制

**User Story:** As a 项目维护者, I want 注释更新只修改被明确指定的文件, so that 变更范围可控、易于审查。

#### Acceptance Criteria

1. THE Annotation_System SHALL 只修改任务中显式点名的 Target_File
2. THE Annotation_System SHALL 不修改未被点名的文件

### Requirement 6: 注释覆盖完整性

**User Story:** As a 代码阅读者, I want 所有需要理解的代码块都有准确注释, so that 不会因遗漏或错误而产生理解障碍。

#### Acceptance Criteria

1. WHEN Target_File 中存在需要读者思考才能理解的语句块 THEN THE Annotation_System SHALL 确保其有准确的 Leading_Comment
2. IF 任何 Critical_Block 缺失注释或注释不准确 THEN THE Annotation_System SHALL 视为任务失败
