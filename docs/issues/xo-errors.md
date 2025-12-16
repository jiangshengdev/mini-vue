# XO Lint 报错记录（4 个）

本文记录一次 `pnpm run xo` 触发的 4 个 lint 报错，按“问题记录/影响/建议”的格式归档，便于后续统一修复与回归。

## 处理原则（严格早失败）

本文后续“建议”统一以 **严格早失败** 为目标：

- Dev：遇到明显不合法的 CSS / attr / props 值时 **warn 并忽略写入**，保证渲染不中断但能快速定位。
- Prod：**忽略写入**（不产生 `"[object Object]"` 等可疑输出），保持稳定性。
- 关键约束：任何情况下都不把普通对象兜底字符串化为 `"[object Object]"` 并写入 DOM。

## 运行命令与输出

- 命令：`pnpm run xo`
- 输出（节选）：

```txt
src/runtime-dom/patch-props.ts:89:58
✖   89:58  resolved will use Object's default stringification format ([object Object]) when stringified.  @typescript-eslint/no-base-to-string
✖   92:48  resolved will use Object's default stringification format ([object Object]) when stringified.  @typescript-eslint/no-base-to-string
✖  117:36  value will use Object's default stringification format ([object Object]) when stringified.     @typescript-eslint/no-base-to-string

playground/src/views/home.tsx:2:22
✖    2:22  Do not import modules using an absolute path                                                   import-x/no-absolute-path
```

---

## 1. `applyStyle` 对 `resolved` 直接 `String(...)`（2 处）

- 位置：`src/runtime-dom/patch-props.ts`
  - `89:58`（`String(resolved)`）
  - `92:48`（`String(resolved)`）
- 规则：`@typescript-eslint/no-base-to-string`
- 现状：
  - `applyStyle` 在对象 style 分支中：
    - `styleValue` 的静态类型为 `unknown`
    - `resolved = styleValue ?? ''` 仍可能是对象（`object`）
    - 直接 `String(resolved)` 会把普通对象转成 `"[object Object]"`
- 影响：
  - 当用户误传 `style={ { color: { x: 1 } } }`（JSX 的“双层花括号”写法在本文中用空格断开以避免文档插值解析）这类值时，最终会写入 `style="color:[object Object]"` 或通过 `setProperty` 写入 `"[object Object]"`，产生难排查的 UI 异常。
  - lint 层面会阻止 CI 通过（当前即为阻塞项）。

### 建议（严格早失败）

1. **在写入前做类型收窄（推荐）**

- 仅接受 `string | number`（可选接受 `boolean`）作为 style value。
- 对 `object/function/symbol/bigint`：
  - Dev：`warn`（提示样式键名与实际类型）
  - Dev/Prod：**直接忽略该条样式写入**（既不赋值也不 `setProperty`），避免出现 `"[object Object]"`。

2. **同时收窄 `style` 对象的类型定义**

- 将 `style` 的 value 约束为 `string | number | null | undefined`，让不合法输入尽早在 TS 层暴露。

3. **不采用对象字符串化兜底**

- 不使用 `String(obj)` / `JSON.stringify(obj)` 作为默认兜底；对象样式视为错误输入，按“忽略 + Dev warn”处理。

---

## 2. `patchDomAttr` 对 `value` 直接 `String(...)`（1 处）

- 位置：`src/runtime-dom/patch-props.ts`
  - `117:36`（`element.setAttribute(key, String(value))`）
- 规则：`@typescript-eslint/no-base-to-string`
- 现状：
  - `patchDomAttr` 在处理非布尔/非空值时统一 `String(value)`。
  - 由于 `value` 是 `unknown`，lint 认为它可能是普通对象，最终会写入 `"[object Object]"`。
- 影响：
  - 对某些属性（例如 `title`、`data-*`）如果误传对象，会写入无意义字符串，调试成本高。
  - 对某些属性（例如 `value`、`aria-*`）也可能产生可访问性/交互异常。

### 建议（严格早失败）

- 在写入 `setAttribute` 前进行类型收窄：仅允许可安全字符串化的原始类型（例如 `string | number | boolean`）。
- 对 `object/function/symbol/bigint`：
  - Dev：`warn`（包含 key 与实际类型）
  - Dev/Prod：**忽略写入**（不调用 `setAttribute`），避免把对象偷偷写成 `"[object Object]"`。
- 对 `null/undefined/false`：维持现有“移除属性”的语义即可。

---

## 3. Playground 中使用以 `/` 开头的资源导入（1 处）

- 位置：`playground/src/views/home.tsx`
  - `2:22`（`import viteLogo from '/vite.svg'`）
- 规则：`import-x/no-absolute-path`
- 现状：
  - 该写法是 Vite 模板中常见的“从项目根/`public` 解析静态资源”的用法。
  - 但 lint 规则将其视为“绝对路径导入”，因此报错。
- 影响：
  - 阻塞 `xo` 通过。
  - 新同学可能会继续复制该模板写法，导致持续出现同类报错。

### 建议（两条路线二选一）

1. **代码侧规避规则（更一致）**
   - 将资源放入 `playground/src/assets` 并使用相对路径导入；或采用项目约定的别名（若适用）。

2. **规则侧适配 Vite 资源导入（更贴合模板）**
   - 在 lint 配置中对“静态资源的根路径导入”做例外处理（例如仅允许 `/*.svg`/`/*.png` 等）。
   - 注意：这属于团队规范选择，需确保不会放开真正的系统绝对路径导入。

---

## 处理优先级建议

1. `@typescript-eslint/no-base-to-string`（3 处）：属于运行期潜在 bug + CI 阻塞，且按“严格早失败”目标需要统一输入收窄与忽略策略。
2. `import-x/no-absolute-path`（1 处）：主要是规范冲突，修复成本低。
