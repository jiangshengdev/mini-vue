import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getBoundaryDir, getPosition, readTsSourceFile, runSrcCheck } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

interface Finding {
  filePath: string
  kind: Kind
  module: string
  position: Position
  boundary: string
}

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

function isForbiddenAliasImport(module: string, boundary: string): boolean {
  const prefix = `@/${boundary}`

  if (!module.startsWith(prefix)) {
    return false
  }

  // 允许 @/other-boundary/...；禁止 @/boundary 或 @/boundary/...
  if (module.length === prefix.length) {
    return true
  }

  const nextChar = module[prefix.length]

  return nextChar === '/'
}

function handleModuleSpecifier(parameters: {
  sourceFile: ts.SourceFile
  moduleSpecifier: ts.Expression
  boundary: string
  kind: Kind
  findings: Finding[]
}): void {
  const { sourceFile, moduleSpecifier, boundary, kind, findings } = parameters

  if (!ts.isStringLiteral(moduleSpecifier)) {
    return
  }

  const module = moduleSpecifier.text

  if (!module.startsWith('@/')) {
    return
  }

  if (!isForbiddenAliasImport(module, boundary)) {
    return
  }

  findings.push({
    filePath: sourceFile.fileName,
    kind,
    module,
    position: getPosition(sourceFile, moduleSpecifier),
    boundary,
  })
}

function checkFile(filePath: string, findings: Finding[]): void {
  const boundary = getBoundaryDir({ srcDir, filePath })

  if (!boundary) {
    return
  }

  const sourceFile = readTsSourceFile(filePath)

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier({
        sourceFile,
        moduleSpecifier: statement.moduleSpecifier,
        boundary,
        kind: 'import',
        findings,
      })
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier({
        sourceFile,
        moduleSpecifier: statement.moduleSpecifier,
        boundary,
        kind: 'export',
        findings,
      })
    }
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, position, boundary } = finding
  const kindText = kind === 'import' ? '导入' : '导出'

  return `${filePath}:${position.line}:${position.column} src/${boundary} 内禁止的${kindText}: "${module}"（请使用相对路径）`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: '✅ 未发现禁止的 @/同边界 导入。',
})
