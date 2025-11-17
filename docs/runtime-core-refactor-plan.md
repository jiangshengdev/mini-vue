# runtime-core 拆分计划

## 背景

当前 `src/jsx/` 目录同时承担 JSX 虚拟节点构建与运行时渲染职责：`vnode/` 负责生成 VNode，但 `renderer/`、`createApp.ts` 等文件已经属于运行时核心逻辑。参考 Vue 官方源码（`packages/runtime-core/` + `packages/runtime-dom/`），需要将运行时部分独立出来，保持模块职责清晰，为后续对齐 Vue 行为奠定基础。

## 拆分目标

- JSX 层仅保留 VNode 工厂、类型与 `jsx/jsxs` 运行时入口。
- 新增 `runtime-core` 模块承载组件挂载、应用实例、调度接口等与平台无关的运行时逻辑。
- 新增 `runtime-dom` 模块收敛 DOM 相关实现（属性打补丁、事件绑定、元素创建）。
- 对外导出结构与 Vue 保持一致：`index.ts` 聚合响应式、runtime-core、runtime-dom 能力，避免命名混乱。
- 在拆分过程中不新增功能，仅移动与调整现有实现；保证现有测试全部通过。

## 迭代路线

1. **目录初始化与入口调整**
   - 新建 `src/runtime-core/`、`src/runtime-dom/` 目录。
   - 将 `createApp`、`render` 的对外导出从 `src/jsx/index.ts` 移到新的 runtime 模块入口，同时更新 `src/index.ts` 导出路径。

2. **运行时核心迁移**
   - 迁移当前 `src/jsx/createApp.ts`、`src/jsx/renderer/render.ts` 至 `runtime-core`（拆分为 `createApp.ts`、`renderer.ts` 等文件）。
   - 保留对 `mountChild`、`applyProps` 等 API 的引用，但暂时继续从原位置导入，确保行为一致。

3. **DOM 特定实现归档**
   - 将 `mount.ts`、`props.ts` 等直接操作 DOM 的文件迁移到 `runtime-dom`，并提供 `createRenderer` 所需的适配层（如 `createElement`, `patchProp`）。
   - 更新 `runtime-core` 代码只依赖抽象接口（传入平台操作函数），不直接引用 DOM API。

4. **JSX 模块瘦身**
   - `src/jsx/` 仅保留 VNode 工厂、类型定义、`createVNode` 等纯粹与 JSX 编译结果相关的功能。
   - `src/jsx-runtime.ts`、`src/jsx-dev-runtime.ts` 继续位于 `src/` 根目录，作为对外运行时入口，与 Vue 官方结构对齐。
   - 移除 JSX 模块中运行时导出，避免职责交叉。

5. **测试与文档同步**
   - 跑通现有 Vitest 用例，确认拆分不影响功能。
   - 更新相关文档（包括本计划、README 片段）记录新的模块边界与引用方式。

## 目录结构参考

```
src/
   index.ts
   jsx-runtime.ts
   jsx-dev-runtime.ts
   jsx/
      vnode/
   runtime-core/
      createApp.ts
      renderer.ts
      index.ts
   runtime-dom/
      rendererOptions.ts
      patchProp.ts
      index.ts
```

以上结构仿照 Vue 官方的 `runtime-core`/`runtime-dom` 划分，保留 `jsx-runtime` 文件与 JSX 模块同级，并仅保留当前项目所需的最小文件集。

## 完成判定

- 所有运行时代码已迁移至 `runtime-core` / `runtime-dom`，`src/jsx/` 不再包含挂载或 DOM 操作。
- `pnpm test` 全部通过。
- 对外入口 `src/index.ts`、示例、测试均已更新到新的导出路径。
- 文档同步记录新的模块职责与引用方式。
