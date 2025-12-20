import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getBoundaryDir, getPosition, readTsSourceFile, runSrcCheck } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Reason =
  | 'cross-boundary-relative'
  | 'cross-boundary-alias-not-index'
  | 'cross-boundary-alias-too-deep'
  | 'cross-boundary-alias-missing'
  | 'cross-boundary-alias-target-not-found'

interface Finding {
  filePath: string
  kind: Kind
  module: string
  position: Position
  boundary: string
  targetBoundary: string
  reason: Reason
}

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

function resolveRelativeModule(fromFilePath: string, module: string): string | undefined {
  const baseDir = path.dirname(fromFilePath)
  const resolvedBase = path.resolve(baseDir, module)

  const candidates = [
    resolvedBase,
    `${resolvedBase}.ts`,
    `${resolvedBase}.tsx`,
    path.join(resolvedBase, 'index.ts'),
    path.join(resolvedBase, 'index.tsx'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
}

function getAliasTargetBoundary(module: string): string | undefined {
  if (!module.startsWith('@/')) {
    return
  }

  const parts = module.split('/').filter(Boolean)

  // @/shared/index.ts => ['@', 'shared', 'index.ts']
  if (parts.length < 2) {
    return
  }

  return parts[1]
}

function isSingleLevelIndexAlias(module: string): boolean {
  return /^@\/[^/]+\/index\.ts$/.test(module)
}

function checkAliasSpecifier(parameters: {
  sourceFile: ts.SourceFile
  moduleSpecifier: ts.StringLiteral
  boundary: string
  kind: Kind
  findings: Finding[]
}): void {
  const { sourceFile, moduleSpecifier, boundary, kind, findings } = parameters
  const module = moduleSpecifier.text

  if (!module.startsWith('@/')) {
    return
  }

  const targetBoundary = getAliasTargetBoundary(module)

  if (!targetBoundary) {
    return
  }

  // 同边界用 @/boundary/... 的限制由另一个脚本负责
  if (targetBoundary === boundary) {
    return
  }

  const position = getPosition(sourceFile, moduleSpecifier)

  if (!module.includes('/')) {
    findings.push({
      filePath: sourceFile.fileName,
      kind,
      module,
      position,
      boundary,
      targetBoundary,
      reason: 'cross-boundary-alias-missing',
    })

    return
  }

  const parts = module.split('/').filter(Boolean)

  // @/reactivity/array/index.ts 这种过深路径不允许
  if (parts.length > 3) {
    findings.push({
      filePath: sourceFile.fileName,
      kind,
      module,
      position,
      boundary,
      targetBoundary,
      reason: 'cross-boundary-alias-too-deep',
    })

    return
  }

  // 必须是 @/<boundary>/index.ts
  if (!isSingleLevelIndexAlias(module)) {
    findings.push({
      filePath: sourceFile.fileName,
      kind,
      module,
      position,
      boundary,
      targetBoundary,
      reason: 'cross-boundary-alias-not-index',
    })

    return
  }

  const targetIndex = path.join(srcDir, targetBoundary, 'index.ts')

  if (!fs.existsSync(targetIndex)) {
    findings.push({
      filePath: sourceFile.fileName,
      kind,
      module,
      position,
      boundary,
      targetBoundary,
      reason: 'cross-boundary-alias-target-not-found',
    })
  }
}

function checkRelativeSpecifier(parameters: {
  sourceFile: ts.SourceFile
  moduleSpecifier: ts.StringLiteral
  boundary: string
  kind: Kind
  findings: Finding[]
}): void {
  const { sourceFile, moduleSpecifier, boundary, kind, findings } = parameters
  const module = moduleSpecifier.text

  if (!module.startsWith('./') && !module.startsWith('../')) {
    return
  }

  const resolved = resolveRelativeModule(sourceFile.fileName, module)

  if (!resolved) {
    return
  }

  const targetBoundary = getBoundaryDir({ srcDir, filePath: resolved })

  if (!targetBoundary) {
    return
  }

  if (targetBoundary === boundary) {
    return
  }

  findings.push({
    filePath: sourceFile.fileName,
    kind,
    module,
    position: getPosition(sourceFile, moduleSpecifier),
    boundary,
    targetBoundary,
    reason: 'cross-boundary-relative',
  })
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

  checkAliasSpecifier({ sourceFile, moduleSpecifier, boundary, kind, findings })
  checkRelativeSpecifier({ sourceFile, moduleSpecifier, boundary, kind, findings })
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

function formatReason(finding: Finding): string {
  switch (finding.reason) {
    case 'cross-boundary-relative': {
      return `跨一级目录禁止相对路径，改用 "@/${finding.targetBoundary}/index.ts"`
    }

    case 'cross-boundary-alias-too-deep': {
      return `跨一级目录 alias 只能一层目录，改用 "@/${finding.targetBoundary}/index.ts"`
    }

    case 'cross-boundary-alias-not-index': {
      return `跨一级目录 alias 必须以 index.ts 结尾，改用 "@/${finding.targetBoundary}/index.ts"`
    }

    case 'cross-boundary-alias-missing': {
      return `跨一级目录 alias 必须为 "@/${finding.targetBoundary}/index.ts"`
    }

    case 'cross-boundary-alias-target-not-found': {
      return `目标 "src/${finding.targetBoundary}/index.ts" 不存在`
    }
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, position, boundary, targetBoundary } = finding
  const kindText = kind === 'import' ? '导入' : '导出'

  return `${filePath}:${position.line}:${position.column} 非法${kindText} src/${boundary} -> src/${targetBoundary}: "${module}"; ${formatReason(finding)}`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: '✅ 未发现禁止的跨边界导入风格。',
})
