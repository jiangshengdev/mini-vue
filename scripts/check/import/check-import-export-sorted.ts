import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, readTsSourceFile, runSrcCheck } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Reason = 'module-specifier' | 'named-specifiers'

interface Finding {
  filePath: string
  kind: Kind
  reason: Reason
  position: Position
  message: string
}

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

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
  elements: ReadonlyArray<ts.ImportSpecifier | ts.ExportSpecifier>
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
  const { exportClause } = statement

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
  const sourceFile = readTsSourceFile(filePath)

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
      // Export { ... } without module specifier
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

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: 'All import/export specifiers are sorted alphabetically.',
})
