# TSX 编译期改写：Devtools 命名增强（Vite 插件）计划

目标：在不改变产物仍为 TSX 的前提下，通过 Vite 插件对 TSX 做编译期 source-to-source 变换，补齐开发者工具所需的命名信息（优先覆盖 `ref/reactive/computed/state` 的变量名），并在运行时提供一个轻量 helper `registerDevtoolsSetupStateName(value, name)` 让 setupState 收集结果能显示更语义化的 key。

## 背景与现状

- 当前 setup 阶段的响应式值会在创建时被自动收集到 `instance.devtoolsRawSetupState`，key 形如 `ref0/reactive0/computed0`（递增序号）。
- 运行时并不知道 “源码里变量叫什么”，因此 Devtools 面板只能展示序号 key。
- 同时，运行时的 `v-model` 写回目前仅支持 `Ref`，对 `obj.foo` 这类可写左值无法在运行时正确写回；编译期拿到左值形态后可做更强的改写（本计划先聚焦 Devtools 命名，v-model 作为后续扩展点）。

## 设计目标

- 仅开发态启用：所有注入逻辑受 `__DEV__` 或等价开发态开关保护，确保生产构建可被 DCE 摇树移除。
- 保持产物仍为 TS/TSX：插件输出仍是 TSX（或 TS）源码字符串，不做 JSX 运行时降级、不要求额外 Babel 步骤。
- 命名来源尽量可靠：只在能静态确定变量名时注入（例如 `const count = ref(0)`），复杂形态（解构、别名、跨文件流动）不强行推断，避免误标。
- 与现有收集机制兼容：避免出现 “既有 ref0 又有 count” 的双份收集；优先采用“重命名/覆盖”策略而非重复注册。

## 方案概述

### 1) 运行时新增 helper：`registerDevtoolsSetupStateName(value, name)`

提供一个 dev-only 的注册入口，用于把“某个响应式对象/Ref/Computed/Reactive 代理”映射到一个稳定名字。

建议语义：

- 仅在组件 setup 执行期间生效（或至少只影响当前 collector），避免全局污染。
- 多次注册同一对象时，按“首次优先”或“后写覆盖”二选一（建议“后写覆盖”，便于用户/插件修正）。
- 支持三类目标：
  - Ref/Computed（对象实例）
  - reactive 代理（Proxy）
  - state（本质是 ref 的增强）
- 失败策略：非对象/undefined 直接忽略；非 dev 环境 no-op。

实现落点（候选）：

- `src/shared/devtools-setup-state.ts`：新增一个 `registerDevtoolsSetupStateName`，内部通过 `currentCollector` 转发给 collector（不引入全局 WeakMap，避免泄漏与跨组件串扰）。
- `src/runtime-core/component/setup.ts`：扩展 collector 结构，新增 `registerName(value, name)` 能力；`collect()` 时若该 value 有 name，则用该 name 作为 key（并避免与已有 key 冲突）。

### 2) 编译期（Vite 插件）注入 register 调用

在 TSX AST 中识别以下模式并注入：

- `const <id> = ref(...)`
- `const <id> = reactive(...)`
- `const <id> = computed(...)`
- `const <id> = state(...)`

注入位置：

- 变量声明之后紧跟一行 `__DEV__ && registerDevtoolsSetupStateName(<id>, '<id>')`
- 或更严格：在组件 `setup` 函数体内，确保注入只发生在 setup 期间。

识别范围：

- 仅处理 `setup()`（或 `SetupComponent`）函数体内的声明（避免模块顶层 ref 被误当成 setup state）。
- 仅处理 `VariableDeclarator.id` 为 `Identifier` 的简单声明，跳过解构与模式匹配。
- 仅处理被调用的 callee 确认为目标 API：
  - 优先支持来自 `@/index.ts` 的具名导入（如 `import { ref } from '@/index.ts'`）
  - 兼容 `import { ref } from '@/reactivity/index.ts'` 等内部路径（按实际项目使用情况补齐）
  - 暂不支持 `foo.ref()`、`Vue.ref()` 这类成员调用

产物要求：

- 使用 `magic-string` 或 oxc/ts AST printer 保持 source map（至少在 dev 下可调试）。
- 插件仅对 `.ts/.tsx` 生效；对依赖（node_modules）默认不处理。

### 3) 命名写入策略（避免双份）

由于现有逻辑会先用 `ref0` 等 key 写入一次，再注册名字会造成重复。推荐改造为：

- collector 内部维护：
  - `recorded: WeakSet<object>`：去重（已有）
  - `named: WeakMap<object, string>`：登记名字
  - `valueToKey: WeakMap<object, string>`：记录某个 value 最终写入的 key（用于后续重命名/覆盖）
- `collect(value, kind)`：
  - 若 `named` 已有 name：优先用 name 作为 key
  - 否则用 `${kind}${index}`
  - 写入 `devtoolsRawSetupState[key] = value`
- `registerName(value, name)`：
  - 若该 value 已写入且 key 不是 name：执行一次“重命名迁移”
    - `devtoolsRawSetupState[name] = devtoolsRawSetupState[oldKey]`
    - `delete devtoolsRawSetupState[oldKey]`
  - 若尚未 collect：只登记到 `named`，等待后续 collect 使用 name

## 测试与验证

- 单测（Vitest）：
  - 新增 `test/devtools/**`：模拟 setup 执行，创建 `ref/reactive/computed` 后调用 `registerDevtoolsSetupStateName`，断言 `devtoolsRawSetupState` key 使用变量名且不保留 `ref0`。
  - 覆盖“先 collect 后 register”的迁移场景与“先 register 后 collect”的场景。
- Playground 手动验证：
  - 新增/改造一个最小示例组件，在 setup 中声明 `const count = ref(0)`，观察 Devtools Components 面板 setup state 的 key 是否显示 `count`。

## 风险与边界

- AST 识别的导入来源会影响正确性：需要先以“项目内部使用的导入写法”为主，逐步扩展。
- 多个变量指向同一对象（别名）时的命名优先级需要明确（建议“后写覆盖”）。
- 仅对 setup 内声明生效：模块顶层响应式值不纳入 setupState 命名（可作为后续扩展点）。

## 后续扩展（不在本计划内）

- 编译期 `v-model` 改写：把 `v-model={obj.foo}` 自动变换为 `v-model={toRef(obj, 'foo')}` 或直接展开为 `modelValue/onUpdate`，以支持非 Ref 左值写回。
- 更复杂的命名提取：解构、对象模式、函数返回值命名、跨语句流动分析等。

