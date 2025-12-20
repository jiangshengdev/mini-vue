# src/ 代码审查汇总报告

## 审查进度

| 审查单元        | 状态   | Critical | Major | Minor | 总计 |
| --------------- | ------ | -------- | ----- | ----- | ---- |
| jsx-foundation  | 已完成 | 0        | 1     | 0     | 1    |
| jsx-runtime     | 已完成 | 0        | 0     | 0     | 0    |
| messages        | 已完成 | 0        | 0     | 0     | 0    |
| reactivity      | 已完成 | 0        | 0     | 0     | 0    |
| router          | 已完成 | 0        | 1     | 0     | 1    |
| runtime-core    | 已完成 | 0        | 1     | 0     | 1    |
| runtime-dom     | 已完成 | 0        | 0     | 0     | 0    |
| shared          | 已完成 | 0        | 0     | 0     | 0    |
| top-level-files | 已完成 | 0        | 0     | 0     | 0    |

## 问题总览

- **Critical**: 0
- **Major**: 3
- **Minor**: 0
- **总计**: 3

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

## 问题概要

- [Major] `jsx-foundation`：`ComponentChildren`/`RenderOutput` 类型不接受 `null`，与运行时允许 `null` 不一致，常见 `return null` 会触发类型报错。
- [Major] `router`：`RouterLink` 渲染的 `href` 去掉了 query/hash，Ctrl/Meta 或 `_blank` 打开新标签时跳转地址被截断。
- [Major] `runtime-core`：`mountApp` 渲染阶段异常时未记录 `container` 或清理，后续 `unmount` 直接返回，可能遗留部分挂载的宿主节点/副作用。
