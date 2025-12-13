# Reactivity 模块问题记录

## 1. 数组变异方法尚未对依赖做专门处理（待迭代）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状：`push`/`pop`/`splice` 等原型方法仍走默认的 `get`/`set`/`length` 联动路径。由于这些方法执行过程中会读取 `length`，当前 `get` 会对 `length` 进行依赖收集；随后数组写入又会触发 `length` 的更新，从而在“副作用函数内调用数组变异方法”的场景产生被动依赖与额外触发。
- 验证结论：成立。当前实现虽然在触发端会跳过 `effectStack.current`，因此典型的“同步自触发无限循环”不一定会出现，但确实会导致不必要的过度执行（例如 effect 内部首轮调用 `push` 后，之后任意外部 `push` 也会让该 effect 多跑一次）。
- 下一步：为数组方法注入专用分支，确保 `push`/`unshift` 等操作一次性触发 `length` 与新增索引，`splice`、`sort` 等批量修改可以复用统一的 `triggerOpTypes`，必要时为 `Instrumentations` 新建 helper，与 Vue 3 类似。
- 测试建议：在 `test/reactivity/effect.test.ts` 增补 `push`/`splice`/`sort` 的回归用例，验证依赖仅触发一次、索引与长度同步更新。

## 2. `mutableSet` 读取旧值时不应通过 `receiver` 触发 getter 的依赖收集（已验证）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状：`mutableSet` 中读取 `previousValue` 使用了 `Reflect.get(target, key, receiver)`。当 `key` 对应访问器属性（getter/setter）时，该读取会执行 getter，且 getter 的 `this` 绑定为代理对象；getter 内部如果读取了其他响应式字段，会在“set 阶段”被错误地收集依赖。
- 影响：副作用函数仅执行赋值（不显式读取 getter 依赖的字段）也会莫名订阅到这些字段，后续更新会造成额外触发与难以定位的依赖链。
- 验证结论：成立。可构造对象含 `get foo(){ return this.bar }`，在 effect 内执行 `state.foo = 1`，随后仅修改 `state.bar` 即可观察 effect 被额外触发。
- 下一步：读取旧值应避免使用 `receiver` 驱动 getter（例如改为基于 `target` 取旧值，或在 set 阶段禁用追踪后再读取旧值）。
- 测试建议：新增“effect 内仅 set getter 属性，不应追踪 getter 内部读取”的回归用例。

## 3. `mutableGet` 对 `Ref` 值缺少自动解包，并会错误地对 Ref 做 `reactive` 包裹（已验证）

- 位置：`src/reactivity/internals/base-handlers.ts`、`src/reactivity/reactive.ts`
- 现状：`mutableGet` 只要命中 `isObject(rawValue)` 就会 `return reactive(rawValue)`。当属性值为 `RefImpl/ComputedRefImpl` 等 Ref 对象时，它不是普通对象/数组，当前 `reactive` 会直接抛 `TypeError: reactive 目前仅支持普通对象或数组`。
- 影响：读取 `reactive({ count: ref(1) }).count` 直接异常；同时也缺少 Vue 语义的“非数组对象属性返回 `ref.value`”自动解包行为。
- 验证结论：成立（且表现为抛错）。
- 下一步：
  - `get` 路径应识别 Ref（基于 `isRef` 或 `refFlag`），并按约定对非数组对象属性进行自动解包。
  - 同时避免将 Ref 当作普通对象递归 `reactive`。
- 测试建议：新增“reactive 对象属性为 Ref 时读取返回解包值且不抛错”的用例，并覆盖数组场景（数组内 Ref 是否解包需明确策略）。

## 4. 响应式数组的 `includes/indexOf/lastIndexOf` 对原始对象查找会失败（已验证）

- 位置：`src/reactivity/internals/base-handlers.ts`
- 现状：响应式数组读取元素时会把对象懒代理成 Proxy，导致 `list.includes(raw)` 实际比较的是 `proxy !== raw`，从而返回 `false`/`-1`。
- 影响：对“原始对象引用”进行查找与去重会出现错误结果，和 Vue 3 行为不一致。
- 验证结论：成立。
- 下一步：为数组查询方法做 instrumentations：优先用原始值查找失败时，再回退到用 `toRaw`/或将参数也转代理后再查找（策略需结合本仓库是否暴露 `toRaw` 决定）。
- 测试建议：新增“reactive([raw]).includes(raw) 为 true / indexOf(raw) 为 0”的回归用例，并覆盖 `lastIndexOf`。
