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

## 3. `mutableGet` 对 `Ref` 值缺少自动解包，并会错误地对 Ref 做 `reactive` 包裹（已修复）

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

## 5. `toRef` 在创建时读取 `target[key]` 导致错误的依赖收集（已验证）

- 位置：`src/reactivity/ref/api.ts`
- 现状：`toRef` 为了复用已有 Ref，会先执行 `const existing = target[key]`。当 `target` 为响应式 Proxy 且当前存在活跃副作用时，该读取会触发 `mutableGet -> track(target, key)`，把外层 effect 错误地收集到该属性依赖中。
- 影响：仅仅是“创建 ref 引用”的操作，也会让外层 effect 订阅 `target[key]` 的变更；后续对该字段的任意更新都会导致 effect 额外重跑，造成过度追踪与性能浪费，且依赖链更难定位。
- 验证结论：成立。可在 effect 内仅调用 `toRef(state, 'a')`（不读取 `.value`），随后修改 `state.a` 仍会触发该 effect 重新执行。
- 下一步：避免在追踪开启时直接读取 `target[key]`。
  - 若引入“暂停追踪/无追踪读取”的机制，可在该检查阶段临时禁用 track。
  - 若不引入全局开关，可考虑通过 `Object.getOwnPropertyDescriptor` 等路径在不触发 getter 的情况下判断“数据属性是否为 Ref”（但访问器属性仍可能需要权衡是否复用）。
- 测试建议：新增“effect 内调用 `toRef(reactiveObj, key)` 不应追踪该 key”的回归用例。

## 6. `RefImpl` 的 setter 未对新值做 `toRaw` 处理，导致原始值与代理值切换时触发多余更新（已验证）

- 位置：`src/reactivity/ref/impl.ts`
- 现状：`RefImpl.set value` 直接以 `Object.is(newValue, this.rawValue)` 判等，并执行 `this.rawValue = newValue`。当用户交替写入同一对象的“原始对象”和“reactive 代理”时（两者不全等），会被判定为变更，从而触发依赖更新。
- 影响：`rawValue` 在原始值与代理值之间跳变，导致无意义的 `triggerEffects`，进而产生多余 effect 执行。
- 验证结论：成立。构造 `const obj = {}; const proxy = reactive(obj); const r = ref(obj)`，在 effect 依赖 `r.value` 后，交替执行 `r.value = proxy` 与 `r.value = obj` 会产生额外触发。
- 下一步：引入 `toRaw`（或等价的代理还原能力），在 setter 中将 `newValue` 归一化为原始对象后再做判等与赋值，以保证 raw/proxy 代表同一实体时不会触发更新。
- 测试建议：新增“ref 对象值在 raw 与 proxy 间切换赋值不应触发”的回归用例。

## 7. `ComputedRefImpl` 未暴露内部 Effect 或停止方法，限制了手动生命周期管理（已验证）

- 位置：`src/reactivity/ref/computed.ts`
- 现状：`ComputedRefImpl` 内部创建 `ReactiveEffect` 并通过 `recordEffectScope` 关联到当前作用域，但实现对外仅暴露 `Ref<T>` 接口（`effect` 为 private），也未提供 `stop()`。
- 影响：在不使用 `EffectScope` 托管的场景（例如全局长期缓存、或手动创建但不在 `effectScope().run()` 内），用户无法主动停止该 computed 的依赖追踪关系；若 computed 被长生命周期对象持有，可能导致依赖链长期保留，增加内存泄漏风险。
- 验证结论：成立。当前 API 层面无法拿到内部 effect，也无法调用 stop；且在无活跃 scope 时 `recordEffectScope` 不会记录该 effect。
- 下一步：为 computed 增补手动停止能力（例如对外暴露 `stop()`，或暴露内部 effect 句柄/调试接口；具体 API 需结合对外导出策略决定）。
- 测试建议：若新增 stop 能力，补充“stop 后 computed 不再参与追踪/触发”的用例；若暂不计划提供能力，应在文档中明确依赖 scope 托管的推荐用法。

## 8. `ObjectRefImpl` 写入前读取旧值会执行 getter，导致写入阶段意外收集依赖（已验证）

- 位置：`src/reactivity/ref/impl.ts`
- 现状：当 `ObjectRefImpl` 处于 `needsLocalDep = true`（即 `dependencyBucket` 存在、目标为普通对象属性托管）时，setter 会先执行 `const previousValue = this.target[this.key]` 用于同值判断。若该属性为访问器属性（getter/setter），这一步会直接执行 getter。
- 影响：若 setter 调用发生在 effect 内（例如 effect 内部“只写不读”某个 `toRef(target, key).value`），getter 内部若读取了任何响应式字段，会在“写入阶段”被错误收集为外层 effect 的依赖，从而造成后续这些字段变更会意外触发该 effect；问题与 `mutableSet` 读取旧值触发 getter 的问题同类，但发生在 ref 层。
- 验证结论：成立。可构造对象：`get foo(){ return state.bar }`，在 effect 内仅执行 `fooRef.value = 1`；随后修改 `state.bar` 仍会触发该 effect。
- 下一步：写入阶段读取旧值需要避免触发 getter 或避免在追踪开启时执行 getter。
  - 若引入“暂停追踪/无追踪执行”的机制，可在读取 `previousValue` 时临时禁用 track。
  - 若不引入全局开关，可考虑在访问器属性场景放弃旧值判等（直接写入并触发），或使用 `Object.getOwnPropertyDescriptor` 仅对数据属性做旧值判等。
- 测试建议：新增“effect 内仅写入 accessor 属性的 ObjectRef，不应追踪 getter 内部读取”的回归用例。

## 9. effect 执行中途 `stop()` 后仍可能作为 parent 被使用，导致子清理无法随父级释放（边缘问题，已验证）

- 位置：`src/reactivity/effect.ts`、`src/reactivity/watch/core.ts`
- 现状：`ReactiveEffect.run()` 在 `shouldTrack=true` 时会将当前实例压入 `effectStack`，并在 `afterRun` 中 `pop()`。若用户在副作用函数执行中途调用 `stop()`，当前 effect 会被标记为 `inactive` 并清理依赖，但它仍然会在剩余执行期间留在 `effectStack.current`。
- 影响：在该 effect 后续执行片段中，如果再创建新的 `effect()` 或 `watch()`，这些逻辑会读取 `effectStack.current` 作为 parent 并向其 `registerCleanup()`。
  - 由于 parent 此时已 `inactive`，且 `stop()` 已经执行过一次 `flushDependencies()`，后续不会再有机会触发父级的 `flushDependencies()` 来消费这些新登记的 cleanup。
  - 结果是：子 effect / watch 的停止逻辑无法随父级释放（需要外部显式 stop），在长生命周期对象/复杂嵌套场景中可能表现为资源泄漏或预期外的持续订阅。
- 验证结论：成立（边缘场景）。可构造“effect 内部先 stop 自己，再创建子 watch/effect，随后仅 stop 父级并不会级联 stop 子级”的复现。
- 下一步：在 stop 发生于执行期间时，避免让已停止实例继续充当 parent（例如在 `registerCleanup` 前额外校验 `parent.active`，或在 `stop()` 时若当前实例位于 `effectStack` 顶部则提前出栈/标记为不可作为 parent）。
- 测试建议：新增“effect 执行中 stop 后创建子 watch/effect，父级 stop 不应泄漏子级”的回归用例。

## 10. `EffectScope.stop()` 执行 cleanup 时不支持重入注册，可能遗漏清理（已验证）

- 位置：`src/reactivity/effect-scope.ts`
- 现状：`stop()` 会拷贝 `cleanups` 并清空原数组，只遍历一次快照；若 cleanup 执行期间又调用 `onScopeDispose()` / `scope.addCleanup()` 注册新的 cleanup，则这些新 cleanup 会进入已清空的数组，但本次 stop 不会再消费。
- 影响：清理回调可能被遗漏，外部资源（定时器/订阅/监听等）无法释放，存在泄漏风险。
- 验证结论：成立。
- 下一步：明确 stop 语义并实现可预期策略：例如在 stop 中循环 drain `cleanups` 直到为空；或在 stop 期间直接禁止新增 cleanup（但需在文档中说明）。
- 测试建议：建议在 `test/reactivity/effect-scope.lifecycle.test.ts` 增补“stop 时 cleanup 重入注册不会被执行”的复现用例。

## 11. `EffectScope.stop()` 末尾才置 `active=false`，stop 期间仍可录入新 effect 导致泄漏（已验证）

- 位置：`src/reactivity/effect-scope.ts`
- 现状：`stop()` 在停止已有 effects、执行 cleanups、级联 stop 子 scope 后，才将 `active` 置为 `false`；因此 stop 期间仍可通过 `scope.run()` 创建 effect，并被 `recordEffect()` 记录进 `effects`。
- 影响：由于停止 effects 的循环已结束，stop 期间新增的 effect 不会被 stop，后续仍会响应响应式更新，造成依赖链与内存泄漏风险。
- 验证结论：成立。
- 下一步：调整 stop 时序（建议 stop 一开始就让 scope 不再收集：例如先置 `active=false` 或引入 `stopping` 状态并在 `recordEffect/addCleanup` 阻止录入）。
- 测试建议：建议在 `test/reactivity/effect-scope.lifecycle.test.ts` 增补“stop 过程中仍可录入新 effect 且不会被 stop”的复现用例。

## 12. `removeChildScope` 未重置子 scope 的 `positionInParent`，导致对象状态脏（已验证）

- 位置：`src/reactivity/effect-scope.ts`
- 现状：父 scope 移除子 scope 时，只通过 swap-pop 调整 `childScopes`，但未将被移除的子 scope 的 `positionInParent` 重置（例如设为 `undefined`）。
- 影响：子 scope 保留过期索引，实例处于“脏状态”；若该实例被复用或在其他路径再次触发移除逻辑，可能导致错误的数组操作或调试困扰。
- 验证结论：成立。
- 下一步：在移除逻辑中同步重置被移除 scope 的 `positionInParent`，并在 stop 断开 parent 前确保状态一致。
- 测试建议：建议在 `test/reactivity/effect-scope.lifecycle.test.ts` 增补“子 scope 被移除后 positionInParent 不会被重置”的复现用例。

## 13. `ReactiveCache` 采用双向 WeakMap，增加状态冗余且可能影响回收（已验证）

- 位置：`src/reactivity/reactive.ts`
- 现状：`ReactiveCache` 同时维护 `rawToReactive`（Raw -> Proxy）与 `reactiveToRaw`（Proxy -> Raw）的双向 WeakMap。
- 影响：
  - 双向结构引入额外状态与内存开销。
  - WeakMap 的 value 为强引用，双向缓存会形成 Raw 与 Proxy 的相互引用链；在某些 GC 实现下可能造成对象保留时间变长，进而放大内存占用风险。
- 验证结论：成立。当前实现确实创建并维护双向映射。
- 下一步：考虑改为单向缓存（Raw -> Proxy），并通过代理对象上的内部标记（例如 RAW/IS_REACTIVE 等符号/字段）完成必要的反查能力。
- 测试建议：补充“同一 raw 多次 reactive 返回同一 proxy”的用例；若引入 toRaw/标记，补充“proxy 可还原 raw / 可被识别为 reactive”的用例。

## 14. `isReactive` 依赖私有缓存反查，扩展性受限（已验证）

- 位置：`src/reactivity/reactive.ts`
- 现状：`isReactive` 仅通过检查对象是否存在于 `reactiveCache` 的反向映射中来判定。
- 影响：该判定与缓存实例强耦合，不利于未来在同一系统内扩展出不同的代理形态（例如 readonly/shallow 变体）或在不同模块边界复用统一的“响应式标记”语义。
- 验证结论：成立。当前判断逻辑仅依赖 `reactiveCache`。
- 下一步：改为检查对象上的内部标记（例如 `__v_isReactive` 或等价符号标记），避免对私有缓存结构产生依赖。
