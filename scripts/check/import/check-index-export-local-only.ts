import path from 'node:path'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/index.ts'
import type { Position } from '../_shared/ts-check.ts'
import { createSourceFileChecker, getPosition, runSrcCheck } from '../_shared/ts-check.ts'

type Reason = 'non-relative' | 'outside-folder' | 'subdir-non-index'

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

  function validateSubdirIndexOnly(resolved: string): { ok: true } | { ok: false; reason: Reason } {
    const relative = path.relative(indexDir, resolved)

    if (!relative) {
      return { ok: true }
    }

    const parts = relative.split(path.sep).filter(Boolean)

    // 允许：
    // - 顶层文件：child.ts
    // - 直接子目录本身：component（由 TS/打包器解析到 component/index.ts）
    // - 直接子目录 index：component/index.ts
    // 禁止：component/anchor.ts、component/sub/xxx.ts 等
    if (parts.length <= 1) {
      return { ok: true }
    }

    if (parts.length === 2 && (parts[1] === 'index.ts' || parts[1] === 'index.tsx')) {
      return { ok: true }
    }

    return { ok: false, reason: 'subdir-non-index' }
  }

  // 允许相对路径（含 "./..."、"../..."、"."），但最终解析路径必须仍在 index.ts 所在目录(含子目录)内。
  if (module.startsWith('.')) {
    const resolved = path.resolve(indexDir, module)

    if (!isWithinDir(indexDir, resolved)) {
      return { ok: false, reason: 'outside-folder' }
    }

    return validateSubdirIndexOnly(resolved)
  }

  // 允许 @/ alias，但同样必须落在 index.ts 所在目录(含子目录)内。
  if (module.startsWith('@/')) {
    const resolved = path.resolve(srcDir, module.slice(2))

    if (!isWithinDir(indexDir, resolved)) {
      return { ok: false, reason: 'outside-folder' }
    }

    return validateSubdirIndexOnly(resolved)
  }

  // 其他：裸模块、绝对路径、node: 等，统一视为非法（index.ts 不应 re-export 外部模块）。
  return { ok: false, reason: 'non-relative' }
}

const checkFile = createSourceFileChecker<Finding>(({ filePath, sourceFile, findings }) => {
  if (path.basename(filePath) !== 'index.ts') {
    return
  }

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
})

function formatFinding(finding: Finding): string {
  const { filePath, module, position, reason } = finding
  const hint =
    reason === 'outside-folder'
      ? 'index.ts 只能导出当前目录（含子目录）的内容；该导出解析后跳出了当前目录'
      : reason === 'subdir-non-index'
        ? 'index.ts 从子目录导出时只能指向子目录的 index.ts（例如 "./component/index.ts" 或 "./component"）'
        : 'index.ts 只能导出当前目录（含子目录）的内容（使用相对路径或 @/ alias 皆可）；禁止 re-export 外部模块'

  return `${filePath}:${position.line}:${position.column} 非法 index.ts 导出: "${module}"; ${hint}`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: '✅ 未发现非法的 index.ts 跨目录导出。',
})
