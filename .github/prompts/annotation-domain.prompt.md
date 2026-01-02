---
agent: agent
---

## 任务

按仓库注释规范，对 `src/<DOMAIN>/**` 做“注释校正与补齐”，不改任何业务逻辑/签名/执行路径。

## 变量（只改这里）

- `DOMAIN`：`jsx-runtime`
- `TARGET_SRC_DIR`：`src/<DOMAIN>`
- `TARGET_TEST_DIR`：`test/<DOMAIN>`

## 必读（强制）

1. 先读通用规范：`.github/prompts/annotation.prompt.md`。
2. 再读三份任务规格并按互链顺序补齐阅读：
   - `.kiro/specs/annotation-src/requirements.md`
   - `.kiro/specs/annotation-src/design.md`
   - `.kiro/specs/annotation-src/tasks.md`
3. 以 `src/jsx-foundation/**` 为注释标杆（短职责 + 关键语句块注释 + 完整 TSDoc）。

## 允许修改的 Target_File（不在本文件静态列举）

你必须自行用命令枚举 `TARGET_SRC_DIR` 下的**全部文件**，并把命令输出作为本次 Target_File 清单；除该清单外禁止修改任何文件。

- 枚举命令（任选其一）：
  - `rg --files TARGET_SRC_DIR`
  - `find TARGET_SRC_DIR -type f`
- 开始修改前：先在回复中贴出本次 Target_File 清单（命令输出原样即可），再开始逐文件处理。
- 进度记录：如需勾选进度，仅允许改 `.kiro/specs/annotation-src/tasks.md`，并在收尾阶段清空回 `[ ]`。

## 交付要求（摘录关键点）

- 每个文件至少 1 段 `Module_Comment`（文件级职责注释）。
- 每个函数必须有**简短**职责注释（以 1 句为主，必要时最多 2 句），且必须使用 TSDoc：`/** ... */`；有参数/返回值时补齐 `@param`/`@returns`。
- 不得删除既有的 TSDoc Release Tag（如 `@public`/`@beta`）。
- 细节下沉：函数声明前只写“做什么/为何存在”，实现细节写在函数体内关键分支/循环/策略块之前。
- 禁止行尾注释；注释使用中文；尽量不扰动空行结构；不新增与注释无关的改动。

## 简洁度加严（解决“注释读起来过于啰嗦”）

- 避免“逐行翻译式注释”：不要对显而易见的赋值/判断/导入加注释。
- `Module_Comment` 以 2~4 句为宜：优先写清楚“做什么/不做什么/与谁交互”，不要罗列导出清单或把实现流程写成小作文。
- 函数职责注释只写意图与存在理由：不要写“先…再…然后…”的步骤描述；不要复述参数类型或变量名字面含义。
- `@param`/`@returns` 保持短句：只写关键语义与约束（例如“是否可选/默认值语义/缓存与惰性”等），不要在标签里描述实现步骤。
- 关键语句块注释以 1 句为主：同一意图的多行代码合并为一段注释，优先解释“为什么这样做/策略是什么”。

## 建议验证

- 先枚举该子域的测试文件（任选其一）：
  - `rg --files TARGET_TEST_DIR`
  - `find TARGET_TEST_DIR -type f`
- 至少选择 1 个与改动最相关的用例文件执行：`pnpm run test <从上一步枚举出的文件路径>`
- 若枚举结果显示该子域存在多个测试文件：优先跑覆盖面更大的单测，再按改动点补跑对应用例。
