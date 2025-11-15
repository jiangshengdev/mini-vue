# JSX 模块问题记录

## 1. 布尔子节点渲染异常（已修复）

- 位置：`src/jsx/renderer/mount.ts:23-44`
- 问题：`mountChild` 仅把 `null/undefined` 视为空节点，布尔值会继续向下执行并被转换成字符串，导致 `{flag && <div/>}` 在 `flag` 为 `false` 时渲染出 `"false"`。
- 影响：与 `normalizeChildren` 的约定不一致，也违背了常见 JSX 行为，页面会出现多余文本。
- 修复：2025-11-15 将布尔值纳入空节点判断，并在 `test/jsx-runtime.test.tsx` 补充 `render(false, container)` 回归用例，已验证通过。

## 2. 组件 children 形态不匹配（已修复）

- 位置：`src/jsx/renderer/mount.ts:86-98`
- 问题：函数组件挂载时无条件把 `vnode.children`（永远是数组）写回 `props.children`。即使仅传入一个子节点，组件也只能拿到数组，与类型定义 `ComponentChildren = VNodeChild | VNodeChild[] | null` 不符。
- 影响：调用方无法按 React/Vue 习惯用“单子节点等于标量”的模式编写组件逻辑，也会让类型约束失去意义。
- 修复：2025-11-15 根据子节点数量择一传递（0 个→`undefined`，1 个→单值，多个→数组），并在 `test/jsx/children.test.tsx` 新增覆盖，确保行为一致。

## 3. style 对象键未转换

- 位置：`src/jsx/renderer/props.ts:32-63`
- 问题：对象形式的 `style` 通过 `el.style.setProperty(name, value)` 原样写入，未将常见的 camelCase（如 `backgroundColor`）转换成 CSS 需要的 kebab-case，浏览器会忽略这些属性。
- 影响：开发者按常规 JSX 写法传入对象样式时，样式失效且没有明确警告。
- 建议：要么在 `applyStyle` 中将 camelCase 转换为 kebab-case 再写入 `setProperty`，要么改用 `HTMLElement.style` 的属性赋值并接受 camelCase，二选一即可。
