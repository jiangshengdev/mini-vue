# Watch 监听全景

> 聚焦 `src/reactivity/watch/core.ts` 与 `utils.ts`，梳理 watch 如何在 ref、getter 与响应式对象之间建立订阅关系，并保障清理与深度追踪的一致行为。

## 设计目标

- **统一入口**：`watch(source, callback, options)` 接受 `Ref`、getter 或普通对象，内部统一转换为 getter，屏蔽外部差异。
- **惰性触发**：默认仅在依赖变化时调度回调；`immediate: true` 可在创建阶段先执行一次。
- **深度可控**：通过 `resolveDeepOption()` 结合显式参数与源特性，决定是否递归遍历嵌套字段。
- **清理闭环**：回调拿到 `onCleanup()` 可以注册销毁逻辑，watch 停止或下一次触发前都会自动执行。

## 核心组成

- `ReactiveEffect getter`：封装底层依赖收集，并将调度交给 `runWatchJob()`，保证每次触发都能重新读取最新值。
- `resolveDeepOption()`：推导 `deep` 最终值。getter/ref 默认浅监听，响应式对象推断为深度，普通对象遵循显式布尔值。
- `createGetter()`：根据源类型生成真正执行的 getter；深度模式下会调用 `traverse()` 递归访问所有字段以触发依赖。
- `traverse()`：使用 `Set` 记录已访问节点，防止循环引用；遇到 ref 会继续向内读取其 `value`。

## 调度流程

1. 创建 `ReactiveEffect`，调度器只负责调用 `runWatchJob()`，避免在依赖触发时直接执行回调。
2. 首次进入根据 `immediate` 决定：立即执行则直接跑一轮 `runWatchJob()`；否则先 `runner.run()` 把旧值缓存起来。
3. 依赖变动时，`runWatchJob()` 会：
   - 检查 effect 是否仍活跃，失活直接跳出。
   - 通过 `runner.run()` 拿到新值并重建依赖。
   - 在浅监听里使用 `Object.is` 比较，防止相同引用触发回调。
   - 先执行上一个清理函数，再调用用户回调并传入 `onCleanup()`。
   - 把当前值缓存到 `oldValue`，供下次比较与回调使用。

## 清理与生命周期

- `onCleanup(fn)`：回调内部调用后会记录本轮清理函数，在下次 `runWatchJob()` 前或手动 `stop()` 时触发。
- `stop()`：显式返回给用户的停止函数，调用后 effect 失活并立刻运行末次清理。
- 父级 effect 关联：若在 effect 内部创建 watch，会通过 `effectStack.current.registerCleanup(stop)` 将停止逻辑挂到父 effect，确保作用域销毁时同步终止。

## 深度监听策略

- 函数源与 ref：默认浅监听，只在返回值或 `value` 发生变化时触发；设置 `deep: true` 会进入 `traverse()`。
- 响应式对象：若未显式传参，自动推导为深度监听，`traverse()` 会访问每个嵌套属性，从而订阅整棵树。
- 普通对象：非响应式对象不会参与依赖追踪，但在深度模式下 `traverse()` 仍会执行一次，适用于与 `reactive()` 配合前的过渡场景。

## 使用与调试提示

- 若回调迟迟不触发，检查 getter 内是否真正读取了响应式字段；watch 只会追踪 getter 执行时访问到的依赖。
- 清理函数适合处理副作用（如事件监听、网络请求），避免重复触发造成资源泄漏。
- 在一次 effect 中反复创建 watch 时，务必把 `stop` 注册到父作用域或显式调用，防止多余的副作用常驻。
- 深度监听对大型对象开销较高，可结合 `getter` 精准返回所需字段，或配合浅监听提升性能。
