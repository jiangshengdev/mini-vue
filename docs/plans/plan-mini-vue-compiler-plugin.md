# Plan

为 `src/vite-plugin/index.ts` 引入编译期总入口 Vite 插件 `miniVueCompilerPlugin`，让外部与仓库内的 `vite.config.ts` 只需注册一次即可按参数启用/禁用编译期能力；当前先把现有 `miniVueDevtoolsSetupStateNamesPlugin` 纳入总入口（默认启用），并保持历史直接使用子插件的方式不受影响。

## Scope

- In: 在 `src/vite-plugin/index.ts` 新增 `miniVueCompilerPlugin`（返回 `PluginOption[]` 聚合多能力）、提供统一 options（含 feature 开关/透传）、默认启用 `devtoolsSetupStateNames`、更新 `vite.config.ts` 用法与补齐测试/类型验证。
- Out: 修改现有编译期变换语义（AST 识别规则/注入代码形态）、新增其它编译期能力实现（仅留扩展位）、调整构建/发布结构或新增 exports 子路径。

## Action items

[x] 盘点现状：确认 `src/vite-plugin/index.ts` 当前导出、`src/index.ts` 聚合导出、`vite.config.ts`/测试对插件入口的使用方式与约束。
[x] 设计总入口 API：新增 `miniVueCompilerPlugin(options?: MiniVueCompilerPluginOptions): PluginOption[]`，并定义 feature 形态为 `false | 子插件Options`（`false` 关闭、`options/undefined` 启用）。
[x] 聚合实现：在 `src/vite-plugin/index.ts` 内通过“返回插件数组”组合子插件，避免在一个插件的 `transform`/hook 中手动调用另一个插件的 hook（保证 `enforce/apply/this` 上下文由 Vite 正常处理）。
[x] 参数合并规则：提供全局 `importSource?: string` 作为默认，子功能 options 可覆盖；当 `devtoolsSetupStateNames` 未显式配置时，默认启用并继承全局 `importSource`。
[x] 稳定顺序：固定子插件在数组中的顺序，并保持各子插件自己的 `name/enforce/apply` 不被覆盖（后续新增能力时仅追加，不改已有顺序）。
[ ] DX 优化（可选但建议）：若总入口默认启用 `devtoolsSetupStateNames`，将其内部 TypeScript 初始化延后到 `.ts/.tsx` 判断之后，避免非 TS 文件触发额外开销（不再考虑 `typescript` 缺失场景）。
[x] 更新仓库用法：把根 `vite.config.ts` 改为只注册 `miniVueCompilerPlugin({ importSource: '@/index.ts' })`，并保留 `miniVueDevtoolsSetupStateNamesPlugin` 的可单独使用能力。
[ ] 测试与验证：新增 `test/vite-plugin/index.test.ts` 覆盖默认启用/显式禁用/参数透传；运行 `pnpm run test`、`pnpm run typecheck`，并补跑 `pnpm run check` 验证导出/边界规则。

## Open questions

- 无（已确认：总入口命名为 `miniVueCompilerPlugin`，`devtoolsSetupStateNames` 在总入口中默认启用）。
