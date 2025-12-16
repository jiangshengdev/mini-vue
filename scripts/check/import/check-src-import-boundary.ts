import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

type Kind = 'import' | 'export'

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

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, position, boundary } = finding

  return `${filePath}:${position.line}:${position.column} forbidden ${kind} within src/${boundary}: "${module}" (use relative path)`
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

  console.log('No forbidden @/same-boundary imports found.')
}

main()
