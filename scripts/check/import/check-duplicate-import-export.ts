import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const srcDir = path.resolve(__dirname, '../src')

type Category = 'type' | 'value'

interface Position {
  line: number
  column: number
}

interface ModuleRecord {
  type?: Position
  value?: Position
}

interface Finding {
  filePath: string
  module: string
  category: Category
  current: Position
  previous: Position
  kind: 'import' | 'export'
}

interface RecordDuplicateParameters {
  map: Map<string, ModuleRecord>
  module: string
  category: Category
  position: Position
  filePath: string
  kind: 'import' | 'export'
  findings: Finding[]
}

function isTypeOnlyNode(node?: { isTypeOnly?: boolean; phaseModifier?: ts.SyntaxKind }): boolean {
  return Boolean(
    node && (node.isTypeOnly === true || node.phaseModifier === ts.SyntaxKind.TypeKeyword),
  )
}

function readSourceFile(filePath: string): ts.SourceFile | undefined {
  const sourceText = fs.readFileSync(filePath, 'utf8')

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
}

function getPosition(sourceFile: ts.SourceFile, node: ts.Node): Position {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

  return { line: line + 1, column: character + 1 }
}

function recordDuplicate(parameters: RecordDuplicateParameters): void {
  const { map, module, category, position, filePath, kind, findings } = parameters
  const record = map.get(module)
  const previous = record?.[category]

  if (previous) {
    findings.push({
      filePath,
      module,
      category,
      current: position,
      previous,
      kind,
    })

    return
  }

  map.set(module, {
    ...record,
    [category]: position,
  })
}

function detectImportUsage(clause: ts.ImportClause | undefined): {
  typeUsed: boolean
  valueUsed: boolean
} {
  if (!clause) {
    return { typeUsed: false, valueUsed: false }
  }

  const clauseIsType = isTypeOnlyNode(clause)
  let typeUsed = clauseIsType
  let valueUsed = false

  if (clauseIsType) {
    return { typeUsed, valueUsed }
  }

  valueUsed = Boolean(clause.name)

  const { namedBindings } = clause

  if (!namedBindings) {
    return { typeUsed, valueUsed }
  }

  if (ts.isNamespaceImport(namedBindings)) {
    valueUsed = true

    return { typeUsed, valueUsed }
  }

  for (const element of namedBindings.elements) {
    if (isTypeOnlyNode(element)) {
      typeUsed = true
    } else {
      valueUsed = true
    }
  }

  return { typeUsed, valueUsed }
}

function handleImport(
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  map: Map<string, ModuleRecord>,
  findings: Finding[],
): void {
  const module = node.moduleSpecifier.getText(sourceFile).slice(1, -1)
  const { typeUsed, valueUsed } = detectImportUsage(node.importClause)

  const position = getPosition(sourceFile, node.moduleSpecifier)

  if (valueUsed) {
    recordDuplicate({
      map,
      module,
      category: 'value',
      position,
      filePath: sourceFile.fileName,
      kind: 'import',
      findings,
    })
  }

  if (typeUsed) {
    recordDuplicate({
      map,
      module,
      category: 'type',
      position,
      filePath: sourceFile.fileName,
      kind: 'import',
      findings,
    })
  }
}

function handleExport(
  node: ts.ExportDeclaration,
  sourceFile: ts.SourceFile,
  map: Map<string, ModuleRecord>,
  findings: Finding[],
): void {
  if (!node.moduleSpecifier) {
    return
  }

  const module = node.moduleSpecifier.getText(sourceFile).slice(1, -1)
  const position = getPosition(sourceFile, node.moduleSpecifier)

  let typeUsed = node.isTypeOnly
  let valueUsed = false

  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    for (const element of node.exportClause.elements) {
      const elementIsType = element.isTypeOnly || node.isTypeOnly

      if (elementIsType) {
        typeUsed = true
      } else {
        valueUsed = true
      }
    }
  } else if (!node.isTypeOnly) {
    // Export * from 'module'
    valueUsed = true
  }

  if (valueUsed) {
    recordDuplicate({
      map,
      module,
      category: 'value',
      position,
      filePath: sourceFile.fileName,
      kind: 'export',
      findings,
    })
  }

  if (typeUsed) {
    recordDuplicate({
      map,
      module,
      category: 'type',
      position,
      filePath: sourceFile.fileName,
      kind: 'export',
      findings,
    })
  }
}

function checkFile(filePath: string, findings: Finding[]): void {
  const sourceFile = readSourceFile(filePath)

  if (!sourceFile) {
    return
  }

  const importMap = new Map<string, ModuleRecord>()
  const exportMap = new Map<string, ModuleRecord>()

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      handleImport(statement, sourceFile, importMap, findings)
      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      handleExport(statement, sourceFile, exportMap, findings)
    }
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, module, category, current, previous, kind } = finding

  return `${filePath}:${current.line}:${current.column} duplicate ${kind} (${category}) of "${module}"; first at line ${previous.line}, column ${previous.column}`
}

function main(): void {
  if (!fs.existsSync(srcDir)) {
    console.error(`src directory not found at ${srcDir}`)
    process.exitCode = 1

    return
  }

  const files = ts.sys.readDirectory(srcDir, ['.ts', '.tsx'], undefined, ['**/*'])
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

  console.log('No duplicate import/export module specifiers found.')
}

main()
