import path from 'node:path'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, listTsFilesInDir, readTsSourceFile } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Reason = 'alias-shape' | 'relative-into-src'

interface Finding {
  filePath: string
  kind: Kind
  module: string
  reason: Reason
  position: Position
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
  moduleSpecifier: ts.Expression
  kind: Kind
  findings: Finding[]
}): void {
  const { sourceFile, moduleSpecifier, kind, findings } = parameters

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
    })

    return
  }

  if (module.startsWith('.')) {
    const resolved = path.resolve(path.dirname(sourceFile.fileName), module)
    const normalizedSrcDir = path.resolve(srcDir)
    const normalizedResolved = path.resolve(resolved)

    if (normalizedResolved === normalizedSrcDir || normalizedResolved.startsWith(`${normalizedSrcDir}${path.sep}`)) {
      findings.push({
        filePath: sourceFile.fileName,
        kind,
        module,
        reason: 'relative-into-src',
        position: getPosition(sourceFile, moduleSpecifier),
      })
    }
  }
}

function checkFile(filePath: string, findings: Finding[]): void {
  const sourceFile = readTsSourceFile(filePath)

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier({
        sourceFile,
        moduleSpecifier: statement.moduleSpecifier,
        kind: 'import',
        findings,
      })
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier({
        sourceFile,
        moduleSpecifier: statement.moduleSpecifier,
        kind: 'export',
        findings,
      })
    }
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, reason, position } = finding

  if (reason === 'relative-into-src') {
    return `${filePath}:${position.line}:${position.column} forbidden ${kind} into src via relative path: "${module}" (use @/<boundary>/index.ts or @/index.ts)`
  }

  return `${filePath}:${position.line}:${position.column} invalid test ${kind} from src: "${module}" (must be @/<boundary>/index.ts or @/index.ts; only one segment after @/)`
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

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(formatFinding(finding))
  }

  process.exitCode = 1
} else {
  console.log('All test imports from src use @/<boundary>/index.ts (single segment) or @/index.ts.')
}
