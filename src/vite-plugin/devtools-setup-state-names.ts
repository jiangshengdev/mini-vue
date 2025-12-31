import type { Plugin } from 'vite'

export interface MiniVueDevtoolsSetupStateNamesPluginOptions {
  /**
   * 注入 `registerDevtoolsSetupStateName` 的 import 来源。
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
}

interface InsertOperation {
  pos: number
  text: string
}

const defaultImportSource = '@jiangshengdev/mini-vue'
const registerName = 'registerDevtoolsSetupStateName'
const supportedFactories = new Set(['computed', 'reactive', 'ref', 'state'])

type TypeScriptApi = typeof import('typescript')

let cachedTs: TypeScriptApi | undefined

async function resolveTypeScript(ctx: { warn: (message: string) => void }): Promise<TypeScriptApi | undefined> {
  if (cachedTs) {
    return cachedTs
  }

  try {
    const module = await import('typescript')
    cachedTs = module
    return cachedTs
  } catch {
    ctx.warn('[mini-vue] TSX 编译期改写插件需要安装 typescript 才能工作，已自动跳过。')
    return undefined
  }
}

function stripQuery(id: string): string {
  const queryIndex = id.indexOf('?')

  return queryIndex >= 0 ? id.slice(0, queryIndex) : id
}

function resolveIndent(text: string, pos: number): string {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  const leading = text.slice(lineStart, pos)
  const match = leading.match(/^[\t ]+/)

  return match?.[0] ?? ''
}

function resolveUniqueName(used: Map<string, number>, base: string): string {
  const current = used.get(base)

  if (current === undefined) {
    used.set(base, 0)
    return base
  }

  const next = current + 1

  used.set(base, next)
  return `${base}$${next}`
}

function unwrapExpression(ts: TypeScriptApi, expression: import('typescript').Expression): import('typescript').Expression {
  let current = expression

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression
      continue
    }

    if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression
      continue
    }

    break
  }

  return current
}

function isSetupComponentType(
  ts: TypeScriptApi,
  typeNode: import('typescript').TypeNode | undefined,
): boolean {
  if (!typeNode) {
    return false
  }

  if (!ts.isTypeReferenceNode(typeNode)) {
    return false
  }

  const { typeName } = typeNode

  if (ts.isIdentifier(typeName)) {
    return typeName.text === 'SetupComponent'
  }

  if (ts.isQualifiedName(typeName)) {
    return ts.isIdentifier(typeName.right) && typeName.right.text === 'SetupComponent'
  }

  return false
}

function getSetupComponentFunction(
  ts: TypeScriptApi,
  declaration: import('typescript').VariableDeclaration,
): import('typescript').FunctionExpression | import('typescript').ArrowFunction | undefined {
  const { initializer } = declaration
  const typedByDeclaration = isSetupComponentType(ts, declaration.type)

  if (!initializer) {
    return undefined
  }

  const typedByInitializer =
    ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)
      ? isSetupComponentType(ts, initializer.type)
      : false

  if (!typedByDeclaration && !typedByInitializer) {
    return undefined
  }

  const unwrapped = unwrapExpression(ts, initializer)

  if (ts.isFunctionExpression(unwrapped) || ts.isArrowFunction(unwrapped)) {
    return unwrapped
  }

  return undefined
}

function resolveImportText(node: import('typescript').Expression): string | undefined {
  return typeof node === 'object' && 'text' in node ? String((node as { text?: unknown }).text) : undefined
}

function resolveRegisterLocalName(parameters: {
  ts: TypeScriptApi
  sourceFile: import('typescript').SourceFile
  importSource: string
}): { localName?: string; augmentImport?: import('typescript').ImportDeclaration } {
  const { ts, sourceFile, importSource } = parameters

  let localName: string | undefined
  let augmentImport: import('typescript').ImportDeclaration | undefined

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue
    }

    const specifierText = resolveImportText(statement.moduleSpecifier)

    if (specifierText !== importSource) {
      continue
    }

    const { importClause } = statement

    if (!importClause || importClause.isTypeOnly) {
      continue
    }

    const { namedBindings } = importClause

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue
    }

    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      const local = element.name.text

      if (imported === registerName) {
        localName = local
        break
      }
    }

    if (localName) {
      break
    }

    augmentImport ??= statement
  }

  return { localName, augmentImport }
}

function resolveMiniVueFactoryLocals(parameters: {
  ts: TypeScriptApi
  sourceFile: import('typescript').SourceFile
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

    if (!importClause || importClause.isTypeOnly) {
      continue
    }

    const { namedBindings } = importClause

    if (!namedBindings || !ts.isNamedImports(namedBindings)) {
      continue
    }

    for (const element of namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text

      if (!supportedFactories.has(imported)) {
        continue
      }

      locals.add(element.name.text)
    }
  }

  return locals
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

function insertNamedImport(parameters: {
  code: string
  importDecl: import('typescript').ImportDeclaration
  importName: string
}): InsertOperation | undefined {
  const { code, importDecl, importName } = parameters
  const importClause = importDecl.importClause

  if (!importClause || importClause.isTypeOnly) {
    return undefined
  }

  const namedBindings = importClause.namedBindings

  if (!namedBindings || !('elements' in namedBindings)) {
    return undefined
  }

  const end = namedBindings.end

  for (let pos = end - 1; pos >= namedBindings.pos; pos -= 1) {
    if (code[pos] === '}') {
      const hasElements = (namedBindings as unknown as { elements: unknown[] }).elements.length > 0
      const prefix = hasElements ? ', ' : ''

      return { pos, text: `${prefix}${importName}` }
    }
  }

  return undefined
}

function insertNewImport(parameters: {
  ts: TypeScriptApi
  sourceFile: import('typescript').SourceFile
  importSource: string
  localName: string
}): InsertOperation {
  const { ts, sourceFile, importSource, localName } = parameters

  let insertPos = 0

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      break
    }

    insertPos = statement.end
  }

  const prefix = insertPos === 0 ? '' : '\n'
  const text = `${prefix}import { ${localName} } from '${importSource}'\n`

  return { pos: insertPos, text }
}

function collectRegisterInsertions(parameters: {
  ts: TypeScriptApi
  sourceFile: import('typescript').SourceFile
  code: string
  registerLocalName: string
  factoryLocals: Set<string>
}): InsertOperation[] {
  const { ts, sourceFile, code, registerLocalName, factoryLocals } = parameters

  const insertions: InsertOperation[] = []

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) {
      return
    }

    for (const declaration of node.declarationList.declarations) {
      const fn = getSetupComponentFunction(ts, declaration)

      if (!fn || !ts.isBlock(fn.body)) {
        continue
      }

      const usedNames = new Map<string, number>()

      const visit = (child: import('typescript').Node, insideNestedFunction: boolean): void => {
        if (!insideNestedFunction && ts.isVariableStatement(child)) {
          const calls: string[] = []

          for (const declarator of child.declarationList.declarations) {
            if (!ts.isIdentifier(declarator.name)) {
              continue
            }

            if (!declarator.initializer) {
              continue
            }

            const unwrapped = unwrapExpression(ts, declarator.initializer)

            if (!ts.isCallExpression(unwrapped)) {
              continue
            }

            if (!ts.isIdentifier(unwrapped.expression)) {
              continue
            }

            const callee = unwrapped.expression.text

            if (!factoryLocals.has(callee)) {
              continue
            }

            const variableName = declarator.name.text
            const registeredName = resolveUniqueName(usedNames, variableName)
            const indent = resolveIndent(code, child.getStart(sourceFile))

            calls.push(`${indent}${registerLocalName}(${variableName}, '${registeredName}')`)
          }

          if (calls.length > 0) {
            const pos = child.end
            const after = code[pos]
            const needsTrailingNewline = after !== '\n' && after !== '\r'
            const text = `\n${calls.join('\n')}${needsTrailingNewline ? '\n' : ''}`

            insertions.push({ pos, text })
          }
        }

        const nextInside = insideNestedFunction || ts.isFunctionLike(child)

        ts.forEachChild(child, (grandChild) => {
          visit(grandChild, nextInside)
        })
      }

      ts.forEachChild(fn.body, (child) => {
        visit(child, false)
      })
    }
  })

  return insertions
}

export function miniVueDevtoolsSetupStateNamesPlugin(
  options: MiniVueDevtoolsSetupStateNamesPluginOptions = {},
): Plugin {
  const importSource = options.importSource ?? defaultImportSource
  const devOnly = options.devOnly ?? true

  return {
    name: 'mini-vue:devtools-setup-state-names',
    enforce: 'pre',
    apply: devOnly ? 'serve' : undefined,
    async transform(code, id) {
      const ts = await resolveTypeScript(this)

      if (!ts) {
        return
      }

      const cleanId = stripQuery(id)

      if (cleanId.endsWith('.d.ts')) {
        return
      }

      const isTsx = cleanId.endsWith('.tsx')
      const isTs = cleanId.endsWith('.ts')

      if (!isTs && !isTsx) {
        return
      }

      const scriptKind = isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      const sourceFile = ts.createSourceFile(cleanId, code, ts.ScriptTarget.Latest, true, scriptKind)

      const factoryLocals = resolveMiniVueFactoryLocals({ ts, sourceFile, importSource })

      if (factoryLocals.size === 0) {
        return
      }

      const { localName: existingRegisterLocalName, augmentImport } = resolveRegisterLocalName({
        ts,
        sourceFile,
        importSource,
      })

      const registerLocalName = existingRegisterLocalName ?? registerName

      const insertions = collectRegisterInsertions({
        ts,
        sourceFile,
        code,
        registerLocalName,
        factoryLocals,
      })

      if (insertions.length === 0) {
        return
      }

      if (!existingRegisterLocalName) {
        const importInsertion = augmentImport
          ? insertNamedImport({ code, importDecl: augmentImport, importName: registerName })
          : undefined

        if (importInsertion) {
          insertions.push(importInsertion)
        } else {
          insertions.push(insertNewImport({ ts, sourceFile, importSource, localName: registerName }))
        }
      }

      return {
        code: applyInsertions(code, insertions),
      }
    },
  }
}
