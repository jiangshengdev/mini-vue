import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

type Kind = 'import' | 'export'

type Reason =
  | 'cross-boundary-relative'
  | 'cross-boundary-alias-not-index'
  | 'cross-boundary-alias-too-deep'
  | 'cross-boundary-alias-missing'
  | 'cross-boundary-alias-target-not-found'

interface Position {
  line: number
  column: number
}

interface Finding {
  filePath: string
  kind: Kind
  module: string
  position: Position
  boundary: string
  targetBoundary: string
  reason: Reason
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const srcDir = path.resolve(__dirname, '../../../src')

function readSourceFile(filePath: string): ts.SourceFile {
  const sourceText = fs.readFileSync(filePath, 'utf8')

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
}

function getPosition(sourceFile: ts.SourceFile, node: ts.Node): Position {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

  return { line: line + 1, column: character + 1 }
}

function getBoundaryDir(filePath: string): string | undefined {
  const relative = path.relative(srcDir, filePath)

  if (!relative || relative.startsWith('..')) {
    return
  }

  const parts = relative.split(path.sep).filter(Boolean)

  // src 顶层文件（例如 src/index.ts）不属于任何一级目录边界
  if (parts.length < 2) {
    return
  }

  return parts[0]
}

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

  return
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

function checkAliasSpecifier(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.StringLiteral,
  boundary: string,
  kind: Kind,
  findings: Finding[],
): void {
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

function checkRelativeSpecifier(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.StringLiteral,
  boundary: string,
  kind: Kind,
  findings: Finding[],
): void {
  const module = moduleSpecifier.text

  if (!module.startsWith('./') && !module.startsWith('../')) {
    return
  }

  const resolved = resolveRelativeModule(sourceFile.fileName, module)

  if (!resolved) {
    return
  }

  const targetBoundary = getBoundaryDir(resolved)

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

function handleModuleSpecifier(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.Expression,
  boundary: string,
  kind: Kind,
  findings: Finding[],
): void {
  if (!ts.isStringLiteral(moduleSpecifier)) {
    return
  }

  checkAliasSpecifier(sourceFile, moduleSpecifier, boundary, kind, findings)
  checkRelativeSpecifier(sourceFile, moduleSpecifier, boundary, kind, findings)
}

function checkFile(filePath: string, findings: Finding[]): void {
  const boundary = getBoundaryDir(filePath)

  if (!boundary) {
    return
  }

  const sourceFile = readSourceFile(filePath)

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier(sourceFile, statement.moduleSpecifier, boundary, 'import', findings)
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      handleModuleSpecifier(sourceFile, statement.moduleSpecifier, boundary, 'export', findings)
    }
  }
}

function formatReason(finding: Finding): string {
  switch (finding.reason) {
    case 'cross-boundary-relative':
      return `跨一级目录禁止相对路径，改用 "@/${finding.targetBoundary}/index.ts"`
    case 'cross-boundary-alias-too-deep':
      return `跨一级目录 alias 只能一层目录，改用 "@/${finding.targetBoundary}/index.ts"`
    case 'cross-boundary-alias-not-index':
      return `跨一级目录 alias 必须以 index.ts 结尾，改用 "@/${finding.targetBoundary}/index.ts"`
    case 'cross-boundary-alias-missing':
      return `跨一级目录 alias 必须为 "@/${finding.targetBoundary}/index.ts"`
    case 'cross-boundary-alias-target-not-found':
      return `目标 "src/${finding.targetBoundary}/index.ts" 不存在`
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, position, boundary, targetBoundary } = finding

  return `${filePath}:${position.line}:${position.column} invalid ${kind} from src/${boundary} -> src/${targetBoundary}: "${module}"; ${formatReason(finding)}`
}

function main(): void {
  if (!fs.existsSync(srcDir)) {
    console.error(`src directory not found at ${srcDir}`)
    process.exitCode = 1

    return
  }

  const files = ts.sys
    .readDirectory(srcDir, ['.ts', '.tsx'], undefined, ['**/*'])
    .filter((filePath) => !filePath.endsWith('.d.ts'))

  const findings: Finding[] = []

  for (const filePath of files) {
    checkFile(filePath, findings)
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(formatFinding(finding))
    }

    process.exitCode = 1

    return
  }

  console.log('No forbidden cross-boundary import style found.')
}

main()
