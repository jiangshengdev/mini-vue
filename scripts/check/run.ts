import { runAllScriptsInDir } from './_shared/run-all.ts'
import { resolveFromImportMeta } from './_shared/paths.ts'

const checkDir = resolveFromImportMeta(import.meta.url, '.')

runAllScriptsInDir(checkDir, { emptyMessage: '未找到检查脚本。' })
