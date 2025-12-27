import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import ts from 'typescript'
import { resolveFromImportMeta } from './_shared/paths.ts'

const projectRoot = resolveFromImportMeta(import.meta.url, '..')
const sourcePath = resolve(projectRoot, 'src/jsx-shim.d.ts')
const targetDir = resolve(projectRoot, 'dist/jsx')
const targetPath = resolve(targetDir, 'index.d.ts')

async function ensureSourceExists() {
  try {
    await access(sourcePath)
  } catch {
    throw new Error('未找到 src/jsx-shim.d.ts，无法生成 JSX 类型声明')
  }
}

async function resolvePackageName() {
  const packageJsonPath = resolve(projectRoot, 'package.json')
  const packageRaw = await readFile(packageJsonPath, 'utf8')
  const parsed = JSON.parse(packageRaw) as unknown

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('package.json 解析失败，预期为对象')
  }

  const { name } = parsed as { name?: unknown }

  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('package.json 缺少 name 字段，无法生成 JSX 类型引用路径')
  }

  return name
}

function collectAliasImports(sourceFile: ts.SourceFile): {
  specifiers: string[]
  rangesToRemove: Array<{ start: number; end: number }>
} {
  const specifiers: string[] = []
  const rangesToRemove: Array<{ start: number; end: number }> = []

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue
    }

    const moduleText = statement.moduleSpecifier.text

    if (!moduleText.startsWith('@/')) {
      continue
    }

    const clause = statement.importClause

    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      continue
    }

    for (const element of clause.namedBindings.elements) {
      if (element.propertyName) {
        specifiers.push(`${element.propertyName.text} as ${element.name.text}`)
      } else {
        specifiers.push(element.name.text)
      }
    }

    rangesToRemove.push({
      start: statement.getFullStart(),
      end: statement.getEnd(),
    })
  }

  return { specifiers, rangesToRemove }
}

function stripRanges(content: string, ranges: Array<{ start: number; end: number }>): string {
  if (ranges.length === 0) {
    return content
  }

  let result = content

  // 从后往前裁剪，避免偏移。
  for (const range of [...ranges].sort((a, b) => {
    return b.start - a.start
  })) {
    result = `${result.slice(0, range.start)}${result.slice(range.end)}`
  }

  return result
}

function prepareShimContent(rawContent: string, packageName: string) {
  const sourceFile = ts.createSourceFile(sourcePath, rawContent, ts.ScriptTarget.Latest, true)
  const { specifiers, rangesToRemove } = collectAliasImports(sourceFile)

  if (specifiers.length === 0) {
    throw new Error('未找到 "@/..." 导入，无法生成 JSX shim')
  }

  const body = stripRanges(rawContent, rangesToRemove).replace(/^\s+/, '')
  const header = `import type { ${specifiers.join(', ')} } from '${packageName}'\n\n`
  const result = `${header}${body}`

  return result.endsWith('\n') ? result : `${result}\n`
}

async function generateShim() {
  await ensureSourceExists()
  const packageName = await resolvePackageName()
  const rawContent = await readFile(sourcePath, 'utf8')
  const finalContent = prepareShimContent(rawContent, packageName)

  await mkdir(targetDir, { recursive: true })
  await writeFile(targetPath, finalContent, 'utf8')
  const readableSource = relative(projectRoot, sourcePath)
  const readableTarget = relative(projectRoot, targetPath)

  console.log(`已生成 ${readableSource} -> ${readableTarget}`)
}

try {
  await generateShim()
} catch (error: unknown) {
  console.error('[generate-jsx-shim] 生成 JSX shim 失败：')
  console.error(error)
  throw error
}
