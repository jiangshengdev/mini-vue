import process from 'node:process'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/index.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, listTsFilesInDir, readTsSourceFile } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Severity = 'error' | 'warn'

interface NamedBindingItem {
  imported: string
  local: string
  isTypeOnly: boolean
}

interface Finding {
  filePath: string
  kind: Kind
  module: string
  position: Position
  names: string[]
  severity: Severity
  suggestion: string
}

const testDir = resolveFromImportMeta(import.meta.url, '../../../test')
const rootIndexFile = resolveFromImportMeta(import.meta.url, '../../../src/index.ts')

function isTypeOnlyNode(node: unknown): boolean {
  const maybe = node as { phaseModifier?: ts.SyntaxKind; isTypeOnly?: boolean } | undefined

  if (!maybe) {
    return false
  }

  if (maybe.phaseModifier !== undefined && maybe.phaseModifier !== null) {
    return maybe.phaseModifier === ts.SyntaxKind.TypeKeyword
  }

  return Boolean(maybe.isTypeOnly)
}

function isRootIndexModule(module: string): boolean {
  return module === '@/index.ts'
}

function isBoundaryIndexModule(module: string): boolean {
  return /^@\/[^/]+\/index\.ts$/.test(module) && !isRootIndexModule(module)
}

function getExportedNamesFromRootIndex(): Set<string> {
  const sourceFile = readTsSourceFile(rootIndexFile)
  const names = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue
    }

    const { exportClause } = statement

    // 本项目根入口目前以显式命名导出为主；export * 无法静态列出，忽略即可。
    if (!exportClause || !ts.isNamedExports(exportClause)) {
      continue
    }

    for (const element of exportClause.elements) {
      // 这里的 element.name 是对外暴露的名字（被 import 的名字）
      names.add(element.name.text)
    }
  }

  return names
}

function collectNamedImportsFromClause(parameters: { importClause: ts.ImportClause | undefined }): {
  kind: 'named' | 'namespace' | 'none'
  items: NamedBindingItem[]
} {
  const { importClause } = parameters
  const namedBindings = importClause?.namedBindings

  if (!namedBindings) {
    return { kind: 'none', items: [] }
  }

  if (ts.isNamespaceImport(namedBindings)) {
    return { kind: 'namespace', items: [] }
  }

  const isClauseTypeOnly = isTypeOnlyNode(importClause)

  return {
    kind: 'named',
    items: namedBindings.elements.map((specifier) => {
      const imported = (specifier.propertyName ?? specifier.name).text
      const local = specifier.name.text
      const isTypeOnly = isClauseTypeOnly || isTypeOnlyNode(specifier)

      return { imported, local, isTypeOnly }
    }),
  }
}

function collectNamedExportsFromClause(parameters: { exportDeclaration: ts.ExportDeclaration }): {
  kind: 'named' | 'namespace' | 'none'
  names: string[]
  items: NamedBindingItem[]
} {
  const { exportDeclaration } = parameters
  const { exportClause } = exportDeclaration

  if (!exportClause) {
    return { kind: 'none', names: [], items: [] }
  }

  if (ts.isNamespaceExport(exportClause)) {
    return { kind: 'namespace', names: [], items: [] }
  }

  const isClauseTypeOnly = isTypeOnlyNode(exportDeclaration)

  const items = exportClause.elements.map((specifier) => {
    const imported = (specifier.propertyName ?? specifier.name).text
    const local = specifier.name.text
    const isTypeOnly = isClauseTypeOnly || isTypeOnlyNode(specifier)

    return { imported, local, isTypeOnly }
  })

  return {
    kind: 'named',
    names: items.map((item) => {
      // Export { a as b } 的对外名字是 b（local）
      return item.local
    }),
    items,
  }
}

function formatNamedItem(item: NamedBindingItem): string {
  if (item.imported === item.local) {
    return item.imported
  }

  return `${item.imported} as ${item.local}`
}

function formatImportStatement(module: string, items: NamedBindingItem[]): string {
  if (items.length === 0) {
    return ''
  }

  const allTypeOnly = items.every((item) => {
    return item.isTypeOnly
  })

  if (allTypeOnly) {
    const body = items
      .map((item) => {
        return formatNamedItem({ ...item, isTypeOnly: true })
      })
      .join(', ')

    return `import type { ${body} } from '${module}'`
  }

  const body = items
    .map((item) => {
      const printed = formatNamedItem(item)

      if (item.isTypeOnly) {
        return `type ${printed}`
      }

      return printed
    })
    .join(', ')

  return `import { ${body} } from '${module}'`
}

function checkFile(parameters: {
  filePath: string
  rootExportNames: Set<string>
  findings: Finding[]
}): void {
  const { filePath, rootExportNames, findings } = parameters

  const sourceFile = readTsSourceFile(filePath)

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) {
        continue
      }

      const module = statement.moduleSpecifier.text

      if (!isBoundaryIndexModule(module)) {
        continue
      }

      const clause = statement.importClause
      const collected = collectNamedImportsFromClause({ importClause: clause })

      if (collected.kind === 'namespace') {
        findings.push({
          filePath: sourceFile.fileName,
          kind: 'import',
          module,
          position: getPosition(sourceFile, statement.moduleSpecifier),
          names: [],
          severity: 'warn',
          suggestion: `尽量优先从 "@/index.ts" 导入；当前为 namespace import，无法静态判断哪些成员可替换`,
        })
        continue
      }

      if (collected.kind === 'none') {
        continue
      }

      const shouldMove = collected.items.filter((item) => {
        return rootExportNames.has(item.imported)
      })

      if (shouldMove.length === 0) {
        continue
      }

      const remain = collected.items.filter((item) => {
        return !rootExportNames.has(item.imported)
      })

      const movedStatement = formatImportStatement('@/index.ts', shouldMove)
      const remainStatement = formatImportStatement(module, remain)

      const suggestion =
        remain.length === 0
          ? `将该导入改为：${movedStatement}`
          : `建议拆分导入：\n- ${movedStatement}\n- ${remainStatement}`

      findings.push({
        filePath: sourceFile.fileName,
        kind: 'import',
        module,
        position: getPosition(sourceFile, statement.moduleSpecifier),
        names: shouldMove
          .map((item) => {
            return item.imported
          })
          .sort(),
        severity: 'error',
        suggestion,
      })

      continue
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      if (!ts.isStringLiteral(statement.moduleSpecifier)) {
        continue
      }

      const module = statement.moduleSpecifier.text

      if (!isBoundaryIndexModule(module)) {
        continue
      }

      const collected = collectNamedExportsFromClause({ exportDeclaration: statement })

      if (collected.kind !== 'named') {
        continue
      }

      const shouldMove = collected.names.filter((name) => {
        return rootExportNames.has(name)
      })

      if (shouldMove.length === 0) {
        continue
      }

      findings.push({
        filePath: sourceFile.fileName,
        kind: 'export',
        module,
        position: getPosition(sourceFile, statement.moduleSpecifier),
        names: shouldMove.sort(),
        severity: 'error',
        suggestion: `测试中避免从 "${module}" re-export 根入口已暴露的符号；改用 "@/index.ts"`,
      })
    }
  }
}

function formatFinding(finding: Finding): string {
  const { filePath, kind, module, position, names, severity, suggestion } = finding
  const level = severity === 'warn' ? '警告' : '错误'
  const kindText = kind === 'import' ? '导入' : '导出'

  const details =
    names.length > 0 ? `; ${kindText}包含可从 @/index.ts 导入的符号：${names.join(', ')}` : ''

  return `${filePath}:${position.line}:${position.column} ${level} 测试${kindText}应优先使用 "@/index.ts": "${module}"${details}\n  ${suggestion}`
}

const rootExportNames = getExportedNamesFromRootIndex()

const files = listTsFilesInDir({
  dirPath: testDir,
  filter(filePath) {
    return !filePath.endsWith('.d.ts')
  },
})

const findings: Finding[] = []

for (const filePath of files) {
  checkFile({ filePath, rootExportNames, findings })
}

const errors = findings.filter((f) => {
  return f.severity === 'error'
})
const warnings = findings.filter((f) => {
  return f.severity === 'warn'
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
      ? '⚠️ 测试导入 prefer-root-index 检查通过（有警告）。'
      : '✅ 所有测试导入均优先使用 @/index.ts。'

  console.log(message)
}
