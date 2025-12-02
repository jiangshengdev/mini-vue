# src/demo 代码审核

## 1. 计数器副作用未释放（已修复）

- 位置：`src/demo/counter.tsx`
- 现状：组件已经改成标准的 setup/render 写法，直接在 JSX 中读取 `state.count`，由 renderer 负责响应式重渲染，不再手动创建 `effect` 或持有 DOM 引用。
- 结果：多次挂载、卸载或热更新都不会遗留 `ReactiveEffect`，也不会继续操作已被移除的节点。

## 2. Demo 入口未在 HMR 期间卸载应用（待修复）

- 位置：`src/demo/main.ts`
- 问题：入口文件只在冷启动时 `createApp(App).mount(host)`，没有为 Vite HMR 添加 `import.meta.hot.accept`/`dispose`。模块热替换时，旧的应用实例（包含前述 `Counter` 的副作用与 DOM 引用）不会调用 `app.unmount()`，从而无法触发任何自定义清理逻辑。
- 影响：即便我们在组件里实现了清理逻辑，也没有触发点可以调用；随着热更新次数增加，副作用与事件监听会线性增长，最终拖慢开发体验。
- 建议：在 `main.ts` 里记录 `const app = createApp(App)` 并在 `import.meta.hot?.dispose(() => app.unmount())` 中调用卸载；如需要保留状态，可在 `accept` 回调里重建应用，确保 demo 对应的生命周期闭环完备。

## 3. 文本更新策略会摧毁按钮内部结构（已修复）

- 位置：`src/demo/counter.tsx`
- 现状：按钮内容完全交由 JSX 描述（`count is {state.count}`），更新由 runtime 重建按钮节点，无需再覆写 `textContent`。
- 结果：即便后续在按钮里放入图标、辅助描述或包裹元素，也不会被响应式更新意外清空。
