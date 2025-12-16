import path from 'node:path'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, readTsSourceFile, runSrcCheck } from '../_shared/ts-check.ts'

type Reason = 'non-relative' | 'outside-folder'

interface Finding {
  filePath: string
  module: string
  position: Position
  reason: Reason
}

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

function isWithinDir(dirPath: string, targetPath: string): boolean {
  const relative = path.relative(dirPath, targetPath)

  if (relative === '') {
    return true
  }

  if (relative === '..') {
    return false
  }

  if (relative.startsWith(`..${path.sep}`)) {
    return false
  }

  return !path.isAbsolute(relative)
}

function isAllowedIndexReExport(
  indexFilePath: string,
  module: string,
): { ok: true } | { ok: false; reason: Reason } {
  const indexDir = path.dirname(indexFilePath)

  // 允许相对路径（含 "./..."、"../..."、"."），但最终解析路径必须仍在 index.ts 所在目录(含子目录)内。
  if (module.startsWith('.')) {
    const resolved = path.resolve(indexDir, module)

    if (!isWithinDir(indexDir, resolved)) {
      return { ok: false, reason: 'outside-folder' }
    }

    return { ok: true }
  }

  // 允许 @/ alias，但同样必须落在 index.ts 所在目录(含子目录)内。
  if (module.startsWith('@/')) {
    const resolved = path.resolve(srcDir, module.slice(2))

    if (!isWithinDir(indexDir, resolved)) {
      return { ok: false, reason: 'outside-folder' }
    }

    return { ok: true }
  }

  // 其他：裸模块、绝对路径、node: 等，统一视为非法（index.ts 不应 re-export 外部模块）。
  return { ok: false, reason: 'non-relative' }
}

function checkFile(filePath: string, findings: Finding[]): void {
  if (path.basename(filePath) !== 'index.ts') {
    return
  }

  const sourceFile = readTsSourceFile(filePath)

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) {
      continue
    }

    const { moduleSpecifier } = statement

    if (!ts.isStringLiteral(moduleSpecifier)) {
      continue
    }

    const module = moduleSpecifier.text
    const allowed = isAllowedIndexReExport(sourceFile.fileName, module)

    if (allowed.ok) {
      continue
    }

    findings.push({
      filePath: sourceFile.fileName,
      module,
      position: getPosition(sourceFile, moduleSpecifier),
      reason: allowed.reason,
    })
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, module, position, reason } = finding
  const hint =
    reason === 'outside-folder'
      ? 'index.ts 只能导出当前目录(含子目录)的内容；该导出解析后跳出了当前目录'
      : 'index.ts 只能导出当前目录(含子目录)的内容（使用相对路径或 @/ alias 皆可）；禁止 re-export 外部模块'

  return `${filePath}:${position.line}:${position.column} invalid index.ts export: "${module}"; ${hint}`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: 'No invalid index.ts cross-folder exports found.',
})
