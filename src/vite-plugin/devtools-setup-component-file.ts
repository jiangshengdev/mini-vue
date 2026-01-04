import type * as Ts from 'typescript'
import type { Plugin, ResolvedConfig } from 'vite'

export interface MiniVueDevtoolsSetupComponentFilePluginOptions {
  /**
   * 识别 `SetupComponent` 类型导入的 import source。
   *
   * @remarks
   * - 外部项目默认应使用包名（如 `@jiangshengdev/mini-vue`）。
   * - 仓库内调试可改为 `@/index.ts`，避免“项目引用自己”。
   */
  importSource?: string
  /**
   * 是否仅在 Vite dev server 生效。
   *
   * @defaultValue true
   */
  devOnly?: boolean
  /**
   * `__file` 的路径格式。
   *
   * @remarks
   * - `relative`：优先输出相对 `config.root` 的路径（更接近 Vue SFC 的 `__file` 体验）。
   * - `absolute`：输出绝对路径，便于某些环境下 `/__open-in-editor` 直接定位文件。
   *
   * @defaultValue 'relative'
   */
  filePathMode?: 'relative' | 'absolute'
  /**
   * 计算相对路径时使用的根目录（默认取 Vite `config.root`）。
   *
   * @remarks
   * 该字段主要用于测试或非标准 root 场景；大多数情况下无需配置。
   */
  root?: string
}

interface InsertOperation {
  pos: number
  text: string
}

const defaultImportSource = '@jiangshengdev/mini-vue'
const setupComponentTypeName = 'SetupComponent'

type TypeScriptApi = typeof Ts

let cachedTs: TypeScriptApi | undefined

async function resolveTypeScript(ctx: {
  warn: (message: string) => void
}): Promise<TypeScriptApi | undefined> {
  if (cachedTs) {
    return cachedTs
  }

  try {
    cachedTs = await import('typescript')

    return cachedTs
  } catch {
    ctx.warn('[mini-vue] devtools 组件源码定位插件需要安装 typescript 才能工作，已自动跳过。')

    return undefined
  }
}

function stripQuery(id: string): string {
  const queryIndex = id.indexOf('?')

  if (queryIndex === -1) {
    return id
  }

  return id.slice(0, queryIndex)
}

function resolveIndent(text: string, pos: number): string {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const leading = text.slice(lineStart, pos)
  const match = /^[\t ]+/.exec(leading)

  return match?.[0] ?? ''
}

function applyInsertions(code: string, insertions: InsertOperation[]): string {
  const sorted = [...insertions].sort((a, b) => {
    return b.pos - a.pos
  })

  let current = code

  for (const insertion of sorted) {
    current = current.slice(0, insertion.pos) + insertion.text + current.slice(insertion.pos)
  }

  return current
}

function resolveImportText(node: Ts.Expression): string | undefined {
  return typeof node === 'object' && 'text' in node
    ? String((node as { text?: unknown }).text)
    : undefined
}

function resolveSetupComponentTypeLocals(parameters: {
  ts: TypeScriptApi
  sourceFile: Ts.SourceFile
  importSource: string
}): Set<string> {
  const { ts, sourceFile, importSource } = parameters

  const locals = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue
    }

    const specifierText = resolveImportText(statement.moduleSpecifier)

    if (specifierText !== importSource) {
      continue
    }

    const { importClause } = statement

    if (!importClause) {
      continue
    }

    const { namedBindings } = importClause

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue
    }

    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text

      if (imported !== setupComponentTypeName) {
        continue
      }

      locals.add(element.name.text)
    }
  }

  return locals
}

function isSetupComponentTypeReference(parameters: {
  ts: TypeScriptApi
  typeNode: Ts.TypeNode
  locals: Set<string>
}): boolean {
  const { ts, typeNode, locals } = parameters

  if (!ts.isTypeReferenceNode(typeNode)) {
    return false
  }

  const { typeName } = typeNode

  return ts.isIdentifier(typeName) && locals.has(typeName.text)
}

function isSetupComponentDeclarator(parameters: {
  ts: TypeScriptApi
  declarator: Ts.VariableDeclaration
  locals: Set<string>
}): boolean {
  const { ts, declarator, locals } = parameters

  if (!ts.isIdentifier(declarator.name)) {
    return false
  }

  const declaredType = declarator.type

  if (declaredType && isSetupComponentTypeReference({ ts, typeNode: declaredType, locals })) {
    return true
  }

  const { initializer } = declarator

  if (!initializer) {
    return false
  }

  let current = initializer

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression
      continue
    }

    if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
      if (isSetupComponentTypeReference({ ts, typeNode: current.type, locals })) {
        return true
      }

      current = current.expression
      continue
    }

    break
  }

  return false
}

function escapeSingleQuotedString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", String.raw`\'`)
}

function normalizeFilePath(value: string): string {
  return value.replaceAll('\\', '/')
}

function resolveFilePathForDevtools(parameters: {
  id: string
  mode: 'relative' | 'absolute'
  root?: string
}): string {
  const { id, mode, root } = parameters
  const normalizedId = normalizeFilePath(id)

  if (mode === 'absolute') {
    return normalizedId
  }

  const fallback = normalizedId.startsWith('/') ? normalizedId.slice(1) : normalizedId

  if (!root) {
    return fallback
  }

  const normalizedRoot = normalizeFilePath(root).replaceAll(/\/+$/g, '')
  const rootPrefix = normalizedRoot.endsWith('/') ? normalizedRoot : `${normalizedRoot}/`

  if (!normalizedId.startsWith(rootPrefix)) {
    return fallback
  }

  const relativePath = normalizedId.slice(rootPrefix.length)

  return relativePath || fallback
}

function collectFileInsertions(parameters: {
  ts: TypeScriptApi
  sourceFile: Ts.SourceFile
  code: string
  setupComponentLocals: Set<string>
  filePath: string
}): InsertOperation[] {
  const { ts, sourceFile, code, setupComponentLocals, filePath } = parameters

  const insertions: InsertOperation[] = []

  const visit = (node: Ts.Node): void => {
    if (ts.isVariableStatement(node)) {
      const calls: string[] = []
      const indent = resolveIndent(code, node.getStart(sourceFile))

      for (const declarator of node.declarationList.declarations) {
        if (!isSetupComponentDeclarator({ ts, declarator, locals: setupComponentLocals })) {
          continue
        }

        if (!ts.isIdentifier(declarator.name)) {
          continue
        }

        const variableName = declarator.name.text

        calls.push(
          `${indent}if (typeof ${variableName} === 'function') ${variableName}.__file ??= '${escapeSingleQuotedString(filePath)}'`,
        )
      }

      if (calls.length > 0) {
        const pos = node.end
        const after = code[pos]
        const needsTrailingNewline = after !== '\n' && after !== '\r'
        const text = `\n${calls.join('\n')}${needsTrailingNewline ? '\n' : ''}`

        insertions.push({ pos, text })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return insertions
}

export function miniVueDevtoolsSetupComponentFilePlugin(
  options: MiniVueDevtoolsSetupComponentFilePluginOptions = {},
): Plugin {
  const importSource = options.importSource ?? defaultImportSource
  const devOnly = options.devOnly ?? true
  const filePathMode = options.filePathMode ?? 'relative'

  let resolvedConfig: ResolvedConfig | undefined

  return {
    name: 'mini-vue:devtools-setup-component-file',
    enforce: 'pre',
    apply: devOnly ? 'serve' : undefined,
    configResolved(config) {
      resolvedConfig = config
    },
    async transform(code, id) {
      const cleanId = stripQuery(id)

      if (cleanId.startsWith('\0') || cleanId.endsWith('.d.ts')) {
        return
      }

      const isTsx = cleanId.endsWith('.tsx')
      const isTs = cleanId.endsWith('.ts')

      if (!isTs && !isTsx) {
        return
      }

      const ts = await resolveTypeScript(this)

      if (!ts) {
        return
      }

      const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      const sourceFile = ts.createSourceFile(
        cleanId,
        code,
        ts.ScriptTarget.Latest,
        true,
        scriptKind,
      )

      const setupComponentLocals = resolveSetupComponentTypeLocals({ ts, sourceFile, importSource })

      if (setupComponentLocals.size === 0) {
        return
      }

      const root = options.root ?? resolvedConfig?.root
      const filePath = resolveFilePathForDevtools({ id: cleanId, mode: filePathMode, root })

      const insertions = collectFileInsertions({
        ts,
        sourceFile,
        code,
        setupComponentLocals,
        filePath,
      })

      if (insertions.length === 0) {
        return
      }

      return {
        code: applyInsertions(code, insertions),
      }
    },
  }
}
