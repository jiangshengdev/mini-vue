# 计划：Playwright E2E 脚本入口矩阵

目标是为 E2E 提供一组清晰的 `pnpm` 脚本入口：默认无头、支持单浏览器快速验证与多浏览器回归，并强制本地与 CI 都使用 `play:build + play:preview` 跑同一套行为（更贴近产物）。

## 已确认的约束

- 默认无头模式。
- 本地也要求可跑全量（chromium/firefox/webkit）。
- 本地模拟（`play:build + play:preview`）需要作为强制入口。
- CI 与本地功能一致（同一套 scripts 与同一套 server 模式）。

## Scope

- In：
  - 调整 `package.json`：增加/整理 `test:e2e:*` 脚本入口，覆盖 quick / all / headed / ui 等场景。
  - 调整 `playwright.config.ts`：恢复多浏览器 projects，默认无头，并将 `webServer` 固定为 preview 模式（统一端口与 host）。
  - 补充一份使用说明文档：列出入口脚本与常见过滤方式（文件/行号/grep/project）。
- Out：
  - 不改动既有 E2E 用例内容（仅规划 scripts/config）。
  - 不引入额外 runner（仍以 Playwright Test 为唯一 E2E 入口）。
  - 不提供 `debug` 脚本入口（需要定位问题时使用 `--headed` / `--ui` + 过滤参数缩小范围）。

## 设计要点

- **统一 server 模式**：本地与 CI 一律走 `pnpm run play:build && pnpm run play:preview --strictPort --port 4173 --host 127.0.0.1`，避免 dev server 与产物行为差异。
- **默认无头**：`playwright.config.ts` 的 `use.headless` 固定为 `true`；需要有头时仅通过脚本追加 `--headed`。
- **入口最小但可组合**：默认入口跑 chromium（快速），回归入口跑三浏览器；其他能力（UI/筛选）走 Playwright CLI 参数，不再维护多份配置文件。
- **过滤与调试友好**：对外统一示例：`pnpm run test:e2e -- e2e/playground-basic.spec.ts`、`pnpm run test:e2e:all -- -g "表单绑定"` 等。

## 建议脚本清单（规划）

- `test:e2e`：快速验证（chromium，无头，preview）。
- `test:e2e:all`：全量回归（三浏览器，无头，preview）。
- `test:e2e:chromium` / `test:e2e:firefox` / `test:e2e:webkit`：按浏览器单跑。
- `test:e2e:headed`：chromium 有头（便于肉眼验证）。
- `test:e2e:all:headed`：三浏览器有头（用于定位跨浏览器问题）。
- `test:e2e:ui`：Playwright UI（默认 chromium）。
- `test:e2e:list`：列出用例（避免启动完整执行）。

## Action items（待落地）

- [ ] 调整 `playwright.config.ts`：恢复三浏览器 projects、默认 `headless: true`、`webServer` 固定 preview（4173 + 127.0.0.1 + strictPort），并移除本地/CI 分支差异。
- [ ] 调整 `package.json`：增加上述脚本入口，并确保所有入口都走同一份 `playwright.config.ts`。
- [ ] 新增文档（建议 `docs/wiki/e2e-playwright.md`）：解释每个脚本用途、常见过滤写法、如何查看报告/trace。
- [ ] 若存在 CI 工作流：改为调用 `pnpm run test:e2e:all`（与本地一致）。

## 验证（落地后）

- `pnpm run test:e2e:list`
- `pnpm run test:e2e`
- `pnpm run test:e2e:all`
