# Plan

将 `src/reactivity` 的 `reactive`/`readonly`/`shallowReactive`/`shallowReadonly`/`toRaw` 等核心行为整体向 Vue 3 对齐，但短期**仅支持**三类目标：`plain object` + `Array` + `Ref`。其余类型（如 Map/Set、Date、class 实例等）暂不实现代理能力：统一走 “Invalid” 路径，在 `__DEV__` 下 `warn` 并返回原值（同时用注释标注与 Vue3 的差异点/后续扩展方向）。

## Scope

- In: `reactive`/`readonly`/`shallowReactive`/`shallowReadonly` 的创建逻辑、目标类型判定与缓存；Proxy handlers 的 track/unwrap/receiver 规则；`toRaw` 递归解包；`isReactive`/`isReadonly` 等判定；`runtime-core` props 的包装策略（避免 shallowReadonly “不追踪” 导致的组件更新断链）；相关单测与文档同步。
- Out: Map/Set/WeakMap/WeakSet 等集合类型的完整实现、class 实例等更多对象类型的观测支持（先走 Invalid + 注释占位）、`markRaw`/`skip` 等高级 API 的对外暴露（如需要可作为后续计划）。

## Action items

[x] 对齐基线：补齐/整理当前实现与 Vue3 的差异清单（以 `core/packages/reactivity/src/reactive.ts`、`core/packages/reactivity/src/baseHandlers.ts` 为参考），明确哪些属于“本次必须对齐”、哪些属于“暂不支持类型”。
[x] 重构代理创建：在 `src/reactivity/reactive.ts` 引入 Vue3 风格的 `createReactiveObject`（或等价抽象），统一处理：- 非对象/Invalid：`__DEV__` 下 `warn`，返回原值（不再 `throw`）。- 代理幂等：`reactive(readonly(x))` 返回 `readonly(x)`；`readonly(reactive(x))` 允许创建只读包裹；重复调用复用缓存。- 目标类型：仅放开 `Array`、`isPlainObject`、`Ref`（其余一律 Invalid）。- Invalid 判定对齐：包含 `Object.isExtensible(target) === false`（`preventExtensions`/`seal`/`freeze`）。
[x] 调整 `toRaw`：将 `src/reactivity/to-raw.ts` 的 `toRaw` 改为递归解包（对齐 Vue3：`raw ? toRaw(raw) : observed`），并放宽为“只要存在 `rawKey` 就解包”，避免被“支持类型”短路。
[x] 对齐 handlers：在 `src/reactivity/internals/base-handlers.ts` 将 get/set 行为向 Vue3 靠拢：- track 规则：仅 mutable/shallowReactive 追踪；readonly/shallowReadonly 不追踪（含 `has`/`ownKeys`）。- shallow 规则：浅层模式应 **提前返回**，从而 “不解包顶层 Ref / 不递归代理嵌套对象”。- Ref receiver：对齐 “proxy wrapping a ref” 的 `Reflect.get/Reflect.set` receiver（`isRef(target) ? target : receiver`），避免 Ref 类方法/访问器被 proxy receiver 干扰。- readonly 解包 Ref：对齐 Vue3，在 deep readonly 下若 `ref.value` 为对象，返回 `readonly(value)`，避免通过 Ref 解包逃逸写入。
[x] 放开 `reactive(ref)`：移除 `reactive`/`shallowReactive` 对 Ref 的特判“直接返回 Ref 本体”，改为统一走 proxy（与 Vue3 一致的统一模型）。
[x] 对齐 `isReactive`/`isReadonly`：让 `isReactive(readonly(reactive(x))) === true`（对齐 Vue3 的 “readonly 包裹 reactive 仍视为 reactive”），并确保对 Ref 目标同样可用。
[x] runtime-core props 改造：调整 `src/runtime-core/component/props.ts` 等路径，使组件内部的 props 源对象为 `shallowReactive`，对外暴露/传递给 render 的为 `shallowReadonly(propsSource)`，从而在 shallowReadonly 不追踪的前提下依然能通过内层 reactive 建立依赖（贴近 Vue3 机制）。
[x] 更新单测：重写/新增用例覆盖关键行为变化，重点包含：- `reactive(ref)`/`shallowReactive(ref)` 返回 proxy（且 `isRef` 仍为 true）。- shallowReactive/shallowReadonly 顶层 Ref **不解包**（对象属性与数组索引两类场景）。- Invalid：原始值与不支持对象类型返回原值 + `__DEV__` warn（替换原先 “抛错” 用例）。- `toRaw` 递归：`toRaw(readonly(reactive(x)))`、`toRaw(shallowReadonly(reactive(x)))` 还原到同一 raw。
[x] 文档同步：更新 `docs/issues/reactivity-issues.md` 与必要的 API 文档，明确本次行为对齐点与“暂不支持类型”的策略（warn + return 原值），并在需要处用注释标注与 Vue3 的差异/后续扩展计划。
[x] 验证回归：跑 `pnpm run test`、`pnpm run ci`，并重点回归 “props 更新触发组件重渲染” 的场景（必要时补充 playground/浏览器套件用例）。

## Decisions

- 支持类型（本期）：`Array`、`isPlainObject` 判定为 true 的对象（原型为 `Object.prototype` / `null`）、以及 `Ref`。
- Invalid 策略（A+B）：对原始值与不支持对象类型，统一返回原值；在 `__DEV__` 下 `warn`（可控）并用注释说明与 Vue3 的差异点/占位。
- shallow\* 规则：`shallowReactive`/`shallowReadonly` 顶层属性值**不解包** Ref（数组索引 Ref 同样不解包）；仅深层 `reactive/readonly` 解包对象属性 Ref。
- `toRaw`：按 Vue3 递归解包直到拿到最底层 raw。
- Invalid 判定：包含 `Object.preventExtensions` / `Object.seal` / `Object.freeze` 等导致 `Object.isExtensible(...) === false` 的对象。
- `readonly(ref)`/`shallowReadonly(ref)`：切换为 **Proxy 化 Ref** 的统一实现，移除 `ReadonlyRefImpl` 过渡层（以 Vue3 的统一模型为准）。
- `warn` 文案：继续集中放在 `src/messages/reactivity.ts` 管理，并**更新**现有文案以匹配新语义（简体中文、覆盖 “仅支持 plain object/Array/Ref + 已原样返回 + dev warn”）。
- Invalid 的 `warn`：保持简单直出（不做“同一对象只提示一次”的去重）。
- `warn` 输出形态：与只读写入警告一致，使用结构化 payload（例如 `console.warn(message, { api, target })`）。
- “暂不支持但 Vue3 可观测” 的对象（如 class 实例）：暂不做白/黑名单说明，先在 Invalid 判定处用注释明确“当前实现的刻意限制/后续扩展方向”，避免被误解为 bug。

## Open questions

- 暂无。
