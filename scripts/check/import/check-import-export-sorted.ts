import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

type Kind = 'import' | 'export'

type Reason = 'module-specifier' | 'named-specifiers'

interface Position {
  line: number
  column: number
}

interface Finding {
  filePath: string
  kind: Kind
  reason: Reason
  position: Position
  message: string
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

function compareAlpha(a: string, b: string): number {
  return a.localeCompare(b, 'en')
}

function compareNamePair(
  a: { localName: string; originalName: string },
  b: { localName: string; originalName: string },
): number {
  const local = compareAlpha(a.localName, b.localName)

  if (local !== 0) {
    return local
  }

  return compareAlpha(a.originalName, b.originalName)
}

function formatFinding(finding: Finding): string {
  const { filePath, position, kind, reason, message } = finding

  return `${filePath}:${position.line}:${position.column} unsorted ${kind} (${reason}): ${message}`
}

function checkModuleSpecifiersSorted(parameters: {
  kind: Kind
  sourceFile: ts.SourceFile
  moduleSpecifiers: Array<{ module: string; node: ts.StringLiteral }>
  findings: Finding[]
}): void {
  const { kind, sourceFile, moduleSpecifiers, findings } = parameters

  let previousModule: string | undefined

  for (const record of moduleSpecifiers) {
    if (previousModule && compareAlpha(previousModule, record.module) > 0) {
      findings.push({
        filePath: sourceFile.fileName,
        kind,
        reason: 'module-specifier',
        position: getPosition(sourceFile, record.node),
        message: `"${record.module}" should come before "${previousModule}"`,
      })
    }

    previousModule = record.module
  }
}

function getNamedSpecifierKey(element: ts.ImportSpecifier | ts.ExportSpecifier): {
  localName: string
  originalName: string
} {
  return {
    localName: element.name.text,
    originalName: element.propertyName?.text ?? element.name.text,
  }
}

function getNamedSpecifierDisplay(element: ts.ImportSpecifier | ts.ExportSpecifier): string {
  if (element.propertyName) {
    return `${element.propertyName.text} as ${element.name.text}`
  }

  return element.name.text
}

function checkNamedSpecifiersSorted(parameters: {
  kind: Kind
  sourceFile: ts.SourceFile
  elements: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[]
  findings: Finding[]
  context: string
}): void {
  const { kind, sourceFile, elements, findings, context } = parameters

  let previousKey: { localName: string; originalName: string } | undefined
  let previousDisplay: string | undefined

  for (const element of elements) {
    const key = getNamedSpecifierKey(element)
    const display = getNamedSpecifierDisplay(element)

    if (previousKey && compareNamePair(previousKey, key) > 0) {
      findings.push({
        filePath: sourceFile.fileName,
        kind,
        reason: 'named-specifiers',
        position: getPosition(sourceFile, element.name),
        message: `${context}: "${display}" should come before "${previousDisplay}"`,
      })
    }

    previousKey = key
    previousDisplay = display
  }
}

function checkImportStatement(
  statement: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  findings: Finding[],
): void {
  const clause = statement.importClause

  if (!clause) {
    return
  }

  const { namedBindings } = clause

  if (!namedBindings || !ts.isNamedImports(namedBindings)) {
    return
  }

  const module = ts.isStringLiteral(statement.moduleSpecifier)
    ? statement.moduleSpecifier.text
    : statement.moduleSpecifier.getText(sourceFile).slice(1, -1)

  checkNamedSpecifiersSorted({
    kind: 'import',
    sourceFile,
    elements: namedBindings.elements,
    findings,
    context: `named imports from "${module}"`,
  })
}

function checkExportStatement(
  statement: ts.ExportDeclaration,
  sourceFile: ts.SourceFile,
  findings: Finding[],
): void {
  const exportClause = statement.exportClause

  if (!exportClause || !ts.isNamedExports(exportClause)) {
    return
  }

  const module = statement.moduleSpecifier
    ? ts.isStringLiteral(statement.moduleSpecifier)
      ? statement.moduleSpecifier.text
      : statement.moduleSpecifier.getText(sourceFile).slice(1, -1)
    : ''
  const moduleText = module ? ` from "${module}"` : ''

  checkNamedSpecifiersSorted({
    kind: 'export',
    sourceFile,
    elements: exportClause.elements,
    findings,
    context: `named exports${moduleText}`,
  })
}

function checkFile(filePath: string, findings: Finding[]): void {
  const sourceFile = readSourceFile(filePath)

  const importModules: Array<{ module: string; node: ts.StringLiteral }> = []
  const exportModules: Array<{ module: string; node: ts.StringLiteral }> = []

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      importModules.push({
        module: statement.moduleSpecifier.text,
        node: statement.moduleSpecifier,
      })
      checkImportStatement(statement, sourceFile, findings)
      continue
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      exportModules.push({
        module: statement.moduleSpecifier.text,
        node: statement.moduleSpecifier,
      })
      checkExportStatement(statement, sourceFile, findings)
      continue
    }

    if (ts.isExportDeclaration(statement)) {
      // export { ... } without module specifier
      checkExportStatement(statement, sourceFile, findings)
    }
  }

  checkModuleSpecifiersSorted({
    kind: 'import',
    sourceFile,
    moduleSpecifiers: importModules,
    findings,
  })
  checkModuleSpecifiersSorted({
    kind: 'export',
    sourceFile,
    moduleSpecifiers: exportModules,
    findings,
  })
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

  console.log('All import/export specifiers are sorted alphabetically.')
}

main()
