# src/demo 代码审核

## 1. 计数器副作用未释放（待修复）

- 位置：`src/demo/Counter.tsx:7-25`
- 问题：`effect(() => { ... })` 返回的 `ReactiveEffect` 句柄从未保存或调用 `stop()`。当 `createApp` 再次渲染或 Vite HMR 替换模块时，旧的组件实例会被 DOM 清空，但副作用依然常驻内存并继续订阅 `state`。一旦旧实例的 `state` 在调试面板或共享逻辑里被修改，就会触发对已经被移除的 `buttonEl` 的写操作，控制台直接报错（`Cannot set properties of null`）。
- 影响：每次 HMR 热更新都会多出一份悬空的 effect，长时间开发会造成无意义的响应式运行与潜在报错；同时这暴露出组件级别没有销毁钩子的问题，阻碍后续扩展。
- 建议：保存 `const counterEffect = effect(...)` 的返回值，并在组件卸载或热替换时调用 `counterEffect.stop()`。若暂时没有组件级生命周期，可在 demo 层通过 `import.meta.hot.dispose`/`app.unmount` 时统一停止所有副作用。

## 2. Demo 入口未在 HMR 期间卸载应用（待修复）

- 位置：`src/demo/main.ts`
- 问题：入口文件只在冷启动时 `createApp(App).mount(host)`，没有为 Vite HMR 添加 `import.meta.hot.accept`/`dispose`。模块热替换时，旧的应用实例（包含前述 `Counter` 的副作用与 DOM 引用）不会调用 `app.unmount()`，从而无法触发任何自定义清理逻辑。
- 影响：即便我们在组件里实现了清理逻辑，也没有触发点可以调用；随着热更新次数增加，副作用与事件监听会线性增长，最终拖慢开发体验。
- 建议：在 `main.ts` 里记录 `const app = createApp(App)` 并在 `import.meta.hot?.dispose(() => app.unmount())` 中调用卸载；如需要保留状态，可在 `accept` 回调里重建应用，确保 demo 对应的生命周期闭环完备。

## 3. 文本更新策略会摧毁按钮内部结构（待修复）

- 位置：`src/demo/Counter.tsx:9-22`
- 问题：副作用通过 `buttonEl.textContent = label` 重写 `button` 的全部子节点。当前 demo 只有纯文本还看不出问题，但一旦在按钮内添加图标、无障碍描述或包裹元素，第一次点击就会把这些节点统统抹掉。
- 影响：示例代码会误导使用者在真实项目里采用相同写法，最终造成结构化内容被意外删除，甚至破坏 `ref` 捕获到的节点层级。
- 建议：要么为文本单独创建 `Text` 节点并只更新该节点，要么让响应式系统负责重新渲染按钮内容（例如通过在 renderer 里支持最小化 diff），避免手动清空整个 `textContent`。
