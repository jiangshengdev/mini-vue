import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, listTsFilesInDir, readTsSourceFile } from '../_shared/ts-check.ts'

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

function checkFile(filePath: string, findings: Finding[]): void {
  const sourceFile = readTsSourceFile(filePath)

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
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, reason, position, severity } = finding
  const level = severity === 'warn' ? 'warn' : 'error'

  if (reason === 'relative-into-src') {
    return `${filePath}:${position.line}:${position.column} ${level} forbidden ${kind} into src via relative path: "${module}" (use @/<boundary>/index.ts or @/index.ts)`
  }

  return `${filePath}:${position.line}:${position.column} ${level} invalid test ${kind} from src: "${module}" (must be @/<boundary>/index.ts or @/index.ts; only one segment after @/)`
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
      ? 'Test src imports check passed with warnings.'
      : 'All test imports from src use @/<boundary>/index.ts (single segment) or @/index.ts.'

  console.log(message)
}
