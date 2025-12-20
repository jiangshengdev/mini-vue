import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, readTsSourceFile, runSrcCheck } from '../_shared/ts-check.ts'

const srcDir = resolveFromImportMeta(import.meta.url, '../../../src')

type Category = 'type' | 'value'

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
  const sourceFile = readTsSourceFile(filePath)

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
  const kindText = kind === 'import' ? '导入' : '导出'
  const categoryText = category === 'type' ? '类型' : '值'

  return `${filePath}:${current.line}:${current.column} 重复${kindText}（${categoryText}）"${module}"；首次出现于第 ${previous.line} 行第 ${previous.column} 列`
}

runSrcCheck({
  srcDir,
  checkFile,
  formatFinding,
  successMessage: '未发现重复的 import/export 模块说明符。',
})
