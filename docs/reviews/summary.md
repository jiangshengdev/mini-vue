# src/ 代码审查汇总报告

## 审查进度

| 审查单元        | 状态   | Critical | Major | Minor | 总计 |
| --------------- | ------ | -------- | ----- | ----- | ---- |
| jsx-foundation  | 已完成 | 0        | 1     | 0     | 1    |
| jsx-runtime     | 已完成 | 0        | 1     | 0     | 1    |
| messages        | 已完成 | 0        | 0     | 1     | 1    |
| reactivity      | 已完成 | 0        | 1     | 0     | 1    |
| router          | 已完成 | 0        | 2     | 1     | 3    |
| runtime-core    | 已完成 | 0        | 0     | 0     | 0    |
| runtime-dom     | 已完成 | 0        | 1     | 0     | 1    |
| shared          | 已完成 | 0        | 0     | 0     | 0    |
| top-level-files | 已完成 | 0        | 1     | 1     | 2    |

## 问题总览

- **Critical**: 0
- **Major**: 7
- **Minor**: 3
- **总计**: 10

## 问题列表

- [Major] src/jsx-foundation/types.ts: `ComponentLike` 参数类型写死为 `never`，`ElementType` 无法接受正常函数组件/SetupComponent，TSX 传入组件直接类型报错。
- [Major] src/jsx-runtime/builder.ts: `h`/`jsx` 复用上述 `ElementType`/`ElementProps`，组件类型不可用，运行时入口在类型层面失效。
- [Major] src/reactivity/watch/utils.ts: 对响应式对象显式 `deep: false` 时 getter 不访问任何属性，未收集依赖导致回调永不触发，浅监听失效。
- [Major] src/router/components/router-view.tsx: 未命中路由时 `matched` 未写入 fallback，RouterView 渲染 `undefined` 而非兜底组件。
- [Major] src/router/core/create-router.ts: `normalizePath` 匹配时丢弃 query/hash，`currentRoute` 状态与地址栏不一致，组件层无法读取 query/hash。
- [Major] src/runtime-dom/create-app.ts: 直接依赖全局 `document`/`import.meta.hot` 与 DOM 原语，无环境探测，SSR/无 DOM 环境 import 即抛错。
- [Major] src/index.ts: 聚合导出复用问题组件类型定义，放大组件/JSX 类型不可用的问题。
- [Minor] src/messages/shared.ts: `sharedRunnerNoPromise` 文案为英文，违背日志统一使用简体中文的约定。
- [Minor] src/router/core/create-router.ts: `appsWithRouter` 为全局 WeakSet，不同 router 实例会互相误判重复安装，缺少多实例容错。
- [Minor] src/jsx-shim.d.ts: `IntrinsicElements` 定义过于宽松（Record<string, PropsShape>），未按 `ElementType` 推导原生标签 props，TSX 内置标签缺乏属性约束。

## 各单元报告链接

- [jsx-foundation](./jsx-foundation.md)
- [jsx-runtime](./jsx-runtime.md)
- [messages](./messages.md)
- [reactivity](./reactivity.md)
- [router](./router.md)
- [runtime-core](./runtime-core.md)
- [runtime-dom](./runtime-dom.md)
- [shared](./shared.md)
- [top-level-files](./top-level-files.md)
