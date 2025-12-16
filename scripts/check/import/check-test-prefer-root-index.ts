import process from 'node:process'
import ts from 'typescript'
import { resolveFromImportMeta } from '../_shared/paths.ts'
import type { Position } from '../_shared/ts-check.ts'
import { getPosition, listTsFilesInDir, readTsSourceFile } from '../_shared/ts-check.ts'

type Kind = 'import' | 'export'

type Severity = 'error' | 'warn'

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

function collectNamedImportsFromClause(namedBindings: ts.NamedImportBindings | undefined): {
  kind: 'named' | 'namespace' | 'none'
  names: string[]
} {
  if (!namedBindings) {
    return { kind: 'none', names: [] }
  }

  if (ts.isNamespaceImport(namedBindings)) {
    return { kind: 'namespace', names: [] }
  }

  return {
    kind: 'named',
    names: namedBindings.elements.map((specifier) => {
      return (specifier.propertyName ?? specifier.name).text
    }),
  }
}

function collectNamedExportsFromClause(exportClause: ts.NamedExportBindings | undefined): {
  kind: 'named' | 'namespace' | 'none'
  names: string[]
} {
  if (!exportClause) {
    return { kind: 'none', names: [] }
  }

  if (ts.isNamespaceExport(exportClause)) {
    return { kind: 'namespace', names: [] }
  }

  return {
    kind: 'named',
    names: exportClause.elements.map((specifier) => {
      // Export { a as b } 的对外名字是 b（specifier.name）
      return specifier.name.text
    }),
  }
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
      const namedBindings = clause?.namedBindings
      const collected = collectNamedImportsFromClause(namedBindings)

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

      const shouldMove = collected.names.filter((name) => {
        return rootExportNames.has(name)
      })

      if (shouldMove.length === 0) {
        continue
      }

      const remain = collected.names.filter((name) => {
        return !rootExportNames.has(name)
      })

      const suggestion =
        remain.length === 0
          ? `将该导入改为：import { ${shouldMove.sort().join(', ')} } from '@/index.ts'`
          : `建议拆分导入：\n- import { ${shouldMove.sort().join(', ')} } from '@/index.ts'\n- import { ${remain.sort().join(', ')} } from '${module}'`

      findings.push({
        filePath: sourceFile.fileName,
        kind: 'import',
        module,
        position: getPosition(sourceFile, statement.moduleSpecifier),
        names: shouldMove.sort(),
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

      const collected = collectNamedExportsFromClause(statement.exportClause)

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
  const level = severity === 'warn' ? 'warn' : 'error'

  const details =
    names.length > 0 ? `; ${kind} 包含可从 @/index.ts 导入的符号：${names.join(', ')}` : ''

  return `${filePath}:${position.line}:${position.column} ${level} test ${kind} should prefer "@/index.ts": "${module}"${details}\n  ${suggestion}`
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
      ? 'Test imports prefer-root-index check passed with warnings.'
      : 'All test imports prefer @/index.ts when possible.'

  console.log(message)
}
