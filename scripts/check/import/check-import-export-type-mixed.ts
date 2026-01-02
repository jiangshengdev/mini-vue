import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/index.ts'
import type { Position } from '../_shared/ts-check.ts'
import { createSourceFileChecker, getPosition, runSrcCheck } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

interface Finding {
  filePath: string
  kind: Kind
  module: string
  position: Position
  typeItems: string[]
  valueItems: string[]
}

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

function isTypeOnlyNode(node?: { isTypeOnly?: boolean; phaseModifier?: ts.SyntaxKind }): boolean {
  return Boolean(
    node && (node.isTypeOnly === true || node.phaseModifier === ts.SyntaxKind.TypeKeyword),
  )
}

function getModuleText(
  sourceFile: ts.SourceFile,
  moduleSpecifier: ts.Expression | undefined,
): string {
  if (!moduleSpecifier) {
    return ''
  }

  if (ts.isStringLiteral(moduleSpecifier)) {
    return moduleSpecifier.text
  }

  return moduleSpecifier.getText(sourceFile)
}

function getNamedSpecifierDisplay(element: ts.ImportSpecifier | ts.ExportSpecifier): string {
  if (element.propertyName) {
    return `${element.propertyName.text} as ${element.name.text}`
  }

  return element.name.text
}

function collectImportItems(clause: ts.ImportClause): {
  typeItems: string[]
  valueItems: string[]
} {
  const typeItems: string[] = []
  const valueItems: string[] = []

  if (clause.name) {
    valueItems.push(clause.name.text)
  }

  const { namedBindings } = clause

  if (!namedBindings) {
    return { typeItems, valueItems }
  }

  if (ts.isNamespaceImport(namedBindings)) {
    valueItems.push(`* as ${namedBindings.name.text}`)

    return { typeItems, valueItems }
  }

  for (const element of namedBindings.elements) {
    const display = getNamedSpecifierDisplay(element)

    if (isTypeOnlyNode(element)) {
      typeItems.push(display)
    } else {
      valueItems.push(display)
    }
  }

  return { typeItems, valueItems }
}

function collectExportItems(declaration: ts.ExportDeclaration): {
  typeItems: string[]
  valueItems: string[]
} {
  const typeItems: string[] = []
  const valueItems: string[] = []
  const clauseIsTypeOnly = isTypeOnlyNode(declaration)

  const { exportClause } = declaration

  if (!exportClause || !ts.isNamedExports(exportClause)) {
    return { typeItems, valueItems }
  }

  for (const element of exportClause.elements) {
    const display = getNamedSpecifierDisplay(element)
    const isTypeOnly = clauseIsTypeOnly || isTypeOnlyNode(element)

    if (isTypeOnly) {
      typeItems.push(display)
    } else {
      valueItems.push(display)
    }
  }

  return { typeItems, valueItems }
}

const checkFile = createSourceFileChecker<Finding>(({ sourceFile, findings }) => {
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause

      if (!clause || isTypeOnlyNode(clause)) {
        continue
      }

      const { typeItems, valueItems } = collectImportItems(clause)

      if (typeItems.length === 0 || valueItems.length === 0) {
        continue
      }

      let mixedSpecifier: ts.ImportSpecifier | undefined

      if (clause.namedBindings) {
        if (ts.isNamedImports(clause.namedBindings)) {
          mixedSpecifier = clause.namedBindings.elements.find((element) => {
            return isTypeOnlyNode(element)
          })
        } else {
          mixedSpecifier = undefined
        }
      } else {
        mixedSpecifier = undefined
      }

      const positionNode = mixedSpecifier?.name ?? statement.moduleSpecifier

      findings.push({
        filePath: sourceFile.fileName,
        kind: 'import',
        module: getModuleText(sourceFile, statement.moduleSpecifier),
        position: getPosition(sourceFile, positionNode),
        typeItems,
        valueItems,
      })
      continue
    }

    if (ts.isExportDeclaration(statement)) {
      const { exportClause } = statement

      if (!exportClause || !ts.isNamedExports(exportClause) || isTypeOnlyNode(statement)) {
        continue
      }

      const { typeItems, valueItems } = collectExportItems(statement)

      if (typeItems.length === 0 || valueItems.length === 0) {
        continue
      }

      const mixedSpecifier = exportClause.elements.find((element) => {
        return isTypeOnlyNode(element)
      })
      const positionNode = mixedSpecifier?.name ?? statement.moduleSpecifier ?? statement

      findings.push({
        filePath: sourceFile.fileName,
        kind: 'export',
        module: getModuleText(sourceFile, statement.moduleSpecifier),
        position: getPosition(sourceFile, positionNode),
        typeItems,
        valueItems,
      })
    }
  }
})

function formatFinding(finding: Finding): string {
  const { filePath, position, kind, module, typeItems, valueItems } = finding
  const kindText = kind === 'import' ? '导入' : '导出'
  const moduleText = module ? `（来自 "${module}"）` : ''

  return `${filePath}:${position.line}:${position.column} 混用类型与值${kindText}${moduleText}：type=[${typeItems.join(
    ', ',
  )}] value=[${valueItems.join(', ')}]；请拆分为两条语句（type 与非 type 分开）。`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: '✅ 未发现混用 type 与非 type 的 import/export 语句。',
})
