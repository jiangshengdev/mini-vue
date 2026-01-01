import type * as Ts from 'typescript'
import type { Plugin } from 'vite'

export type MiniVueTransformVmodelWritebackPluginOptions = Record<string, never>

interface Replacement {
  start: number
  end: number
  text: string
}

type TypeScriptApi = typeof Ts

const pluginName = 'mini-vue:transform-v-model-writeback'

let cachedTs: TypeScriptApi | undefined
let tsResolveFailed = false

function stripQuery(id: string): string {
  const queryIndex = id.indexOf('?')

  if (queryIndex === -1) {
    return id
  }

  return id.slice(0, queryIndex)
}

async function resolveTypeScript(ctx: {
  warn: (message: string) => void
}): Promise<TypeScriptApi | undefined> {
  if (cachedTs) {
    return cachedTs
  }

  if (tsResolveFailed) {
    return undefined
  }

  try {
    cachedTs = await import('typescript')

    return cachedTs
  } catch {
    tsResolveFailed = true
    ctx.warn('[mini-vue] TSX 编译期 v-model 写回改写需要安装 typescript 才能工作，已自动跳过。')

    return undefined
  }
}

function unwrapExpression(ts: TypeScriptApi, expression: Ts.Expression): Ts.Expression {
  let current: Ts.Expression = expression

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression
      continue
    }

    if (ts.isAsExpression(current) || ts.isSatisfiesExpression(current)) {
      current = current.expression
      continue
    }

    if (ts.isNonNullExpression(current)) {
      current = current.expression
      continue
    }

    break
  }

  return current
}

function isThisKeyword(ts: TypeScriptApi, node: Ts.Node): boolean {
  return node.kind === ts.SyntaxKind.ThisKeyword
}

function applyReplacements(code: string, replacements: Replacement[]): string {
  const sorted = [...replacements].sort((a, b) => {
    return a.start - b.start
  })
  let lastIndex = 0
  let result = ''

  for (const replacement of sorted) {
    result += code.slice(lastIndex, replacement.start)
    result += replacement.text
    lastIndex = replacement.end
  }

  result += code.slice(lastIndex)

  return result
}

function isComponentTag(ts: TypeScriptApi, tagName: Ts.JsxTagNameExpression): boolean {
  if (ts.isIdentifier(tagName)) {
    const [firstChar] = tagName.text

    if (!firstChar) {
      return false
    }

    return firstChar === firstChar.toUpperCase()
  }

  return true
}

function resolveModelBindingPaths(
  ts: TypeScriptApi,
  sourceFile: Ts.SourceFile,
  expression: Ts.Expression,
): { readable: string; writable: string } | undefined {
  const unwrapped = unwrapExpression(ts, expression)

  if (ts.isIdentifier(unwrapped) || isThisKeyword(ts, unwrapped)) {
    const text = unwrapped.getText(sourceFile)

    return { readable: text, writable: text }
  }

  if (ts.isPropertyAccessExpression(unwrapped) && !ts.isPropertyAccessChain(unwrapped)) {
    const base = resolveModelBindingPaths(ts, sourceFile, unwrapped.expression)

    if (!base) {
      return undefined
    }

    const name = unwrapped.name.getText(sourceFile)

    return {
      readable: `${base.readable}.${name}`,
      writable: `${base.writable}.${name}`,
    }
  }

  if (ts.isElementAccessExpression(unwrapped) && !ts.isElementAccessChain(unwrapped)) {
    const argument = unwrapped.argumentExpression

    if (argument && ts.isStringLiteral(argument)) {
      const base = resolveModelBindingPaths(ts, sourceFile, unwrapped.expression)

      if (!base) {
        return undefined
      }

      const key = argument.getText(sourceFile)

      return {
        readable: `${base.readable}[${key}]`,
        writable: `${base.writable}[${key}]`,
      }
    }
  }

  return undefined
}

export function miniVueTransformVmodelWritebackPlugin(
  _options: MiniVueTransformVmodelWritebackPluginOptions = {},
): Plugin {
  return {
    name: pluginName,
    enforce: 'pre',
    async transform(code, id) {
      const cleanId = stripQuery(id)

      if (!cleanId.endsWith('.tsx') || cleanId.endsWith('.d.ts')) {
        return
      }

      const ts = await resolveTypeScript(this)

      if (!ts) {
        return
      }

      const sourceFile = ts.createSourceFile(
        cleanId,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      const replacements: Replacement[] = []
      const warnUnsupported = (pos: number) => {
        this.warn({
          message:
            '[mini-vue] v-model 写回仅支持静态可写路径（标识符、属性访问、字符串字面量下标），请改用 computed({ get, set }) 或手写 modelValue/onUpdate:modelValue。',
          id: cleanId,
          pos,
        })
      }

      const visitAttributes = (
        tagName: Ts.JsxTagNameExpression,
        attributes: readonly Ts.JsxAttributeLike[],
      ) => {
        if (!isComponentTag(ts, tagName)) {
          return
        }

        for (const attribute of attributes) {
          if (!ts.isJsxAttribute(attribute)) {
            continue
          }

          if (attribute.name.getText(sourceFile) !== 'v-model') {
            continue
          }

          const { initializer } = attribute

          if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) {
            warnUnsupported(attribute.getStart(sourceFile))
            continue
          }

          const unwrapped = unwrapExpression(ts, initializer.expression)

          if (ts.isIdentifier(unwrapped) || isThisKeyword(ts, unwrapped)) {
            /* 保留简单标识符/this 给运行时兜底（Ref 写回），避免误把 const/Ref 绑定改写为可变赋值。 */
            continue
          }

          const resolved = resolveModelBindingPaths(ts, sourceFile, initializer.expression)

          if (!resolved) {
            warnUnsupported(attribute.getStart(sourceFile))
            continue
          }

          replacements.push({
            start: attribute.getStart(sourceFile),
            end: attribute.getEnd(),
            text: ` modelValue={${resolved.readable}} {...{ 'onUpdate:modelValue': (value) => { ${resolved.writable} = value } }}`,
          })
        }
      }

      const visit = (node: Ts.Node) => {
        if (ts.isJsxSelfClosingElement(node)) {
          visitAttributes(node.tagName, node.attributes.properties)
        } else if (ts.isJsxOpeningElement(node)) {
          visitAttributes(node.tagName, node.attributes.properties)
        }

        ts.forEachChild(node, visit)
      }

      visit(sourceFile)

      if (replacements.length === 0) {
        return
      }

      return {
        code: applyReplacements(code, replacements),
      }
    },
  }
}

export { pluginName as miniVueTransformVmodelWritebackPluginName }
