# 本仓库的 Copilot 指南

目的：帮助 AI 快速掌握 mini-vue 的响应式实现与前端演示环境，缩短调研时间。

## 大局观

- 技术栈：Vite 7（被 `pnpm overrides` 锁定为 `rolldown-vite@7.2.2`）+ TypeScript + Vitest。仓库名虽含 “vue”，当前聚焦自研响应式内核，无 Vue 运行时。
- 浏览器演示入口：`index.html` 加载 `/src/demo/main.ts`，用于手动体验；实际对外 API 在 `src/index.ts`，仅导出 `reactive` 与 `effect`。
- 静态资源放 `public/`（以 `/foo.svg` 绝对路径引用），模块私有资源放 `src/` 并通过 import 获得 URL；`src/demo/main.ts` 演示了两种引用方式。

## 核心模块速览

- `src/reactivity/reactive.ts`：`ReactiveCache` 复用 Proxy，拒绝数组、非对象输入；若传已代理对象直接返回。扩展时务必复用缓存逻辑。
- `src/reactivity/internals/baseHandlers.ts`：`mutableHandlers` 拆分 get/set；get 内部懒代理嵌套对象并调用 `track`，set 通过 `Object.is` 判等后触发 `trigger`。
- `src/reactivity/effect.ts`：`ReactiveEffect` 负责依赖清理、嵌套 effect 生命周期（通过 `effectScope`）。`effect(fn)` 立即执行并返回可 `run/stop` 的句柄。
- `src/reactivity/internals/operations.ts`：`DepRegistry` 用 `WeakMap<object, Map<key, Dep>>` 建立依赖图；`track`/`trigger` 依赖 `effectScope.current` 判定当前活跃副作用。
- `test/*.test.ts`：以 Vitest 验证缓存、懒代理、依赖切换与嵌套 effect，不要改动行为导致测试失效；新增能力请补测试说明预期。

## 开发与调试

- 安装：`pnpm install`（Node 18+）。
- HMR：`pnpm dev` 启动示例页面，可在 `src/demo/` 调试交互。
- 构建：`pnpm build` 会先跑 `tsc` 严格检查，再执行 `vite build` 输出到 `dist/`。
- 测试：`pnpm test` 运行 Vitest（jsdom 环境）；定位单例可用 `pnpm test -- effect.test.ts`。
- 预览：`pnpm preview` 查看生产包。

## 代码约定

- 中文输出：代码注释、文档、机器人回复一律中文，示例沿用现有语调。
- TS 严格 ESM：`allowImportingTsExtensions` 要求本地导入包含 `.ts`，`verbatimModuleSyntax` 禁止写 `import foo from './x.js'` 这类合成默认；保持命名导入。
- 禁止副作用导入：`noUncheckedSideEffectImports` 强制显式引用 export；新增模块若只执行初始化逻辑，请暴露函数并在入口调用。
- DOM 访问：使用 `document.querySelector<HTMLElement>()`，对必然存在的节点才加 `!`。示例请贴合 `src/demo/main.ts` 风格。
- ESLint 允许 `_` 前缀参数表示“有意未用”；复现 Vue API 时可借此规避 lint。
- Vite `alias: {'@': './src'}` 已启用，需用别名时保持 `import { reactive } from '@/reactivity/reactive.ts'` 的 `.ts` 后缀。

## 常见坑

- Reactive 缓存：跳过 `ReactiveCache` 会导致同一原对象生成多个 Proxy，引发依赖错乱。
- 嵌套 effect：记得在父级 `effect` 内注册子级，当前实现自动清理，若手动管理需调用 `registerCleanup`。
- 依赖切换：`effect` 每次 `run()` 前会 `resetState`，新增响应字段时不要忘记通过读取建立依赖，否则不会被触发。
- 数组尚未支持：`reactive([])` 会抛异常，若实现数组请同步更新错误消息与测试。

## 贡献建议

- 先读 `test/`，理解每个场景；新增行为请用 Vitest 描述复现方式。
- 变更 `reactivity/` 需兼顾 demo：`src/demo/main.ts` 可引用 `reactive`/`effect` 做可视化反馈，便于人工验证。

若某部分仍不清晰，请告知具体段落，我会继续补充。
