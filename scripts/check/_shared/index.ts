/**
 * Check 脚本共享工具出口。
 *
 * @remarks
 * 仅允许在 `index.ts` 中做聚合导出，避免在其他命名文件中转发实现。
 */
export { resolveFromImportMeta } from '../../_shared/paths.ts'
