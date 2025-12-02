# src/demo 代码审核

## 1. 计数器副作用未释放（已修复）

- 位置：`src/demo/counter.tsx`
- 现状：组件已经改成标准的 setup/render 写法，直接在 JSX 中读取 `state.count`，由 renderer 负责响应式重渲染，不再手动创建 `effect` 或持有 DOM 引用。
- 结果：多次挂载、卸载或热更新都不会遗留 `ReactiveEffect`，也不会继续操作已被移除的节点。

## 2. Demo 入口未在 HMR 期间卸载应用（已修复）

- 位置：`src/runtime-dom/create-app.ts`、`src/demo/main.ts`
- 现状：HMR 生命周期被封装进 DOM 版 `createApp`，自动缓存最近一次挂载的容器，在 `vite:beforeUpdate` 与 `dispose` 阶段调用 `unmountDomApp`，热更新完成后根据缓存信息自动 `mount` 最新组件。
- 结果：入口文件仍保持最简写法，仅负责首次 `createApp(App).mount(host)`；HMR 期间旧树会被正确卸载并重建，副作用与事件处理器不会在热更新中堆积。

## 3. 文本更新策略会摧毁按钮内部结构（已修复）

- 位置：`src/demo/counter.tsx`
- 现状：按钮内容完全交由 JSX 描述（`count is {state.count}`），更新由 runtime 重建按钮节点，无需再覆写 `textContent`。
- 结果：即便后续在按钮里放入图标、辅助描述或包裹元素，也不会被响应式更新意外清空。
