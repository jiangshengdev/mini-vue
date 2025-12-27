import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { createSourceFileChecker, getPosition, listTsFilesInDir } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Reason = 'alias-shape' | 'relative-into-src'

type Severity = 'error' | 'warn'

interface Finding {
  filePath: string
  kind: Kind
  module: string
  reason: Reason
  position: Position
  severity: Severity
}

const testDir = resolveFromImportMeta(import.meta.url, '../../../test')
const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

function isValidTestSrcAliasImport(module: string): boolean {
  if (module === '@/index.ts') {
    return true
  }

  return /^@\/[^/]+\/index\.ts$/.test(module)
}

function handleModuleSpecifier(parameters: {
  sourceFile: ts.SourceFile
  isNamespaceImport: boolean
  moduleSpecifier: ts.Expression
  kind: Kind
  findings: Finding[]
}): void {
  const { sourceFile, isNamespaceImport, moduleSpecifier, kind, findings } = parameters

  if (!ts.isStringLiteral(moduleSpecifier)) {
    return
  }

  const module = moduleSpecifier.text

  if (module.startsWith('@/')) {
    if (isValidTestSrcAliasImport(module)) {
      return
    }

    findings.push({
      filePath: sourceFile.fileName,
      kind,
      module,
      reason: 'alias-shape',
      position: getPosition(sourceFile, moduleSpecifier),
      severity: isNamespaceImport ? 'warn' : 'error',
    })

    return
  }

  if (module.startsWith('.')) {
    const resolved = path.resolve(path.dirname(sourceFile.fileName), module)
    const normalizedSrcDir = path.resolve(srcDir)
    const normalizedResolved = path.resolve(resolved)

    if (
      normalizedResolved === normalizedSrcDir ||
      normalizedResolved.startsWith(`${normalizedSrcDir}${path.sep}`)
    ) {
      findings.push({
        filePath: sourceFile.fileName,
        kind,
        module,
        reason: 'relative-into-src',
        position: getPosition(sourceFile, moduleSpecifier),
        severity: isNamespaceImport ? 'warn' : 'error',
      })
    }
  }
}

const checkFile = createSourceFileChecker<Finding>(({ sourceFile, findings }) => {
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      const clause = statement.importClause
      const namedBindings = clause?.namedBindings
      const isNamespaceImport = namedBindings ? ts.isNamespaceImport(namedBindings) : false

      handleModuleSpecifier({
        sourceFile,
        isNamespaceImport,
        moduleSpecifier: statement.moduleSpecifier,
        kind: 'import',
        findings,
      })
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier({
        sourceFile,
        isNamespaceImport: false,
        moduleSpecifier: statement.moduleSpecifier,
        kind: 'export',
        findings,
      })
    }
  }
})

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, reason, position, severity } = finding
  const level = severity === 'warn' ? '警告' : '错误'
  const kindText = kind === 'import' ? '导入' : '导出'

  if (reason === 'relative-into-src') {
    return `${filePath}:${position.line}:${position.column} ${level} 禁止通过相对路径${kindText} src: "${module}"（请使用 @/<boundary>/index.ts 或 @/index.ts）`
  }

  return `${filePath}:${position.line}:${position.column} ${level} 非法的测试${kindText} src: "${module}"（必须为 @/<boundary>/index.ts 或 @/index.ts；@/ 后只能有一层目录）`
}

const files = listTsFilesInDir({
  dirPath: testDir,
  filter(filePath) {
    return !filePath.endsWith('.d.ts')
  },
})

const findings: Finding[] = []

for (const filePath of files) {
  checkFile(filePath, findings)
}

const errors = findings.filter((finding) => {
  return finding.severity === 'error'
})
const warnings = findings.filter((finding) => {
  return finding.severity === 'warn'
})

if (warnings.length > 0) {
  for (const finding of warnings) {
    console.warn(formatFinding(finding))
  }
}

if (errors.length > 0) {
  for (const finding of errors) {
    console.error(formatFinding(finding))
  }

  process.exitCode = 1
} else {
  const message =
    warnings.length > 0
      ? '⚠️ 测试 src 导入检查通过（有警告）。'
      : '✅ 所有测试从 src 的导入均使用 @/<boundary>/index.ts（单层）或 @/index.ts。'

  console.log(message)
}
