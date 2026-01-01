import type * as Ts from 'typescript'
import type { Plugin } from 'vite'

export type DiagnosticLevel = 'warn' | 'error' | 'off'

export interface MiniVueTransformPropsDestructureDiagnosticsOptions {
  watchOrToRef?: DiagnosticLevel
  write?: DiagnosticLevel
}

export interface MiniVueTransformPropsDestructurePluginOptions {
  diagnostics?: MiniVueTransformPropsDestructureDiagnosticsOptions
}

interface Replacement {
  start: number
  end: number
  text: string
}

interface RemoveRange {
  start: number
  end: number
}

interface ScopeFrame {
  names: Set<string>
  isFunction: boolean
}

interface BindingInfo {
  propKey: string
}

interface SetupComponentContext {
  fn: Ts.FunctionExpression | Ts.ArrowFunction
  propsName: string
  bindings: Map<string, BindingInfo>
  removeRanges: RemoveRange[]
  initialReplacements: Replacement[]
  nestedWarnTargets: Ts.Node[]
}

interface TransformContext {
  ts: TypeScriptApi
  sourceFile: Ts.SourceFile
  code: string
  diagnostics: Required<MiniVueTransformPropsDestructureDiagnosticsOptions>
  id: string
  warn: (warning: { message: string; id?: string; pos?: number }) => void
  error: (error: { message: string; id?: string; pos?: number }) => void
  watchLikeLocals: Set<string>
  toRefLikeLocals: Set<string>
}

type TypeScriptApi = typeof Ts

const defaultDiagnostics: Required<MiniVueTransformPropsDestructureDiagnosticsOptions> = {
  watchOrToRef: 'warn',
  write: 'error',
}

const pluginName = 'mini-vue:transform-props-destructure'

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
    ctx.warn('[mini-vue] TSX 编译期改写插件需要安装 typescript 才能工作，已自动跳过。')

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

    break
  }

  return current
}

function isSetupComponentType(ts: TypeScriptApi, typeNode: Ts.TypeNode | undefined): boolean {
  if (!typeNode || !ts.isTypeReferenceNode(typeNode)) {
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
  declaration: Ts.VariableDeclaration,
): Ts.FunctionExpression | Ts.ArrowFunction | undefined {
  const { initializer } = declaration
  const typedByDeclaration = isSetupComponentType(ts, declaration.type)

  if (!initializer) {
    return
  }

  const typedByInitializer =
    ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)
      ? isSetupComponentType(ts, initializer.type)
      : false

  if (!typedByDeclaration && !typedByInitializer) {
    return
  }

  const unwrapped = unwrapExpression(ts, initializer)

  if (ts.isFunctionExpression(unwrapped) || ts.isArrowFunction(unwrapped)) {
    return unwrapped
  }
}

function resolveUniqueName(used: Set<string>, base: string): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }

  let index = 1

  while (true) {
    const candidate = `${base}$${index}`

    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }

    index += 1
  }
}

function resolvePropsParameter(
  ts: TypeScriptApi,
  sourceFile: Ts.SourceFile,
  fn: Ts.FunctionLike,
  hoistedNames: Set<string>,
): { propsName: string; bindings: Map<string, BindingInfo>; replacement?: Replacement } | undefined {
  const firstParameter = fn.parameters[0]

  if (!firstParameter) {
    return undefined
  }

  if (ts.isIdentifier(firstParameter.name)) {
    return {
      propsName: firstParameter.name.text,
      bindings: new Map(),
    }
  }

  if (!ts.isObjectBindingPattern(firstParameter.name)) {
    return undefined
  }

  const bindings = collectObjectBindings(ts, sourceFile, firstParameter.name)

  if (!bindings) {
    return undefined
  }

  const propsName = resolveUniqueName(hoistedNames, 'props')
  const typeText = firstParameter.type ? firstParameter.type.getText(sourceFile) : ''
  const initializerText = firstParameter.initializer
    ? ` = ${firstParameter.initializer.getText(sourceFile)}`
    : ''

  const replacement: Replacement = {
    start: firstParameter.getStart(sourceFile),
    end: firstParameter.getEnd(),
    text: `${propsName}${typeText ? `: ${typeText}` : ''}${initializerText}`,
  }

  return { propsName, bindings, replacement }
}

function collectObjectBindings(
  ts: TypeScriptApi,
  sourceFile: Ts.SourceFile,
  pattern: Ts.ObjectBindingPattern,
): Map<string, BindingInfo> | undefined {
  const bindings = new Map<string, BindingInfo>()

  for (const element of pattern.elements) {
    if (ts.isOmittedExpression(element) || element.dotDotDotToken) {
      return undefined
    }

    if (!ts.isIdentifier(element.name)) {
      return undefined
    }

    const propKeyNode = element.propertyName ?? element.name

    if (ts.isPrivateIdentifier(propKeyNode)) {
      return undefined
    }

    const propKey = ts.isIdentifier(propKeyNode) ? propKeyNode.text : propKeyNode.getText(sourceFile)

    bindings.set(element.name.text, {
      propKey,
    })
  }

    return bindings
  }

function collectTopLevelDestructure(
  ts: TypeScriptApi,
  sourceFile: Ts.SourceFile,
  fn: Ts.FunctionExpression | Ts.ArrowFunction,
  propsName: string,
): { bindings: Map<string, BindingInfo>; removeRanges: RemoveRange[]; nestedWarnTargets: Ts.Node[] } {
  const bindings = new Map<string, BindingInfo>()
  const removeRanges: RemoveRange[] = []
  const nestedWarnTargets: Ts.Node[] = []
  const { body } = fn

  if (!body || !ts.isBlock(body)) {
    return { bindings, removeRanges, nestedWarnTargets }
  }

  for (const statement of body.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }

    const { declarationList } = statement

    if (declarationList.declarations.length !== 1) {
      continue
    }

    const declaration = declarationList.declarations[0]

    if (!ts.isObjectBindingPattern(declaration.name)) {
      continue
    }

    if (!declaration.initializer) {
      continue
    }

    const initializer = unwrapExpression(ts, declaration.initializer)

    if (!ts.isIdentifier(initializer) || initializer.text !== propsName) {
      continue
    }

    const currentBindings = collectObjectBindings(ts, sourceFile, declaration.name)

    if (!currentBindings) {
      continue
    }

    for (const [key, value] of currentBindings.entries()) {
      bindings.set(key, value)
    }

    removeRanges.push({
      start: statement.getFullStart(),
      end: statement.getEnd(),
    })
  }

  const visitNested = (node: Ts.Node): void => {
    if (ts.isFunctionLike(node) && node !== fn) {
      return
    }

    if (ts.isVariableDeclaration(node) && isPropsDestructurePattern(ts, node, propsName)) {
      if (!removeRanges.some((range) => node.getStart() >= range.start && node.getEnd() <= range.end)) {
        nestedWarnTargets.push(node.name)
      }
    }

    ts.forEachChild(node, (child) => {
      visitNested(child)
    })
  }

  ts.forEachChild(body, (child) => {
    visitNested(child)
  })

  return { bindings, removeRanges, nestedWarnTargets }
}

function applyReplacements(code: string, replacements: Replacement[]): string {
  const sorted = [...replacements].sort((a, b) => {
    return b.start - a.start
  })

  let current = code

  for (const replacement of sorted) {
    current = current.slice(0, replacement.start) + replacement.text + current.slice(replacement.end)
  }

  return current
}

function isWithinRanges(pos: number, end: number, ranges: RemoveRange[]): boolean {
  return ranges.some((range) => {
    return pos >= range.start && end <= range.end
  })
}

function collectBindingNames(ts: TypeScriptApi, name: Ts.BindingName, result: Set<string>): void {
  if (ts.isIdentifier(name)) {
    result.add(name.text)
    return
  }

  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) {
      continue
    }

    if (element.name) {
      collectBindingNames(ts, element.name, result)
    }
  }
}

function addBindingsToScope(
  ts: TypeScriptApi,
  target: Ts.BindingName | undefined,
  scopes: ScopeFrame[],
  hoistToFunction: boolean,
): void {
  if (!target) {
    return
  }

  const names = new Set<string>()

  collectBindingNames(ts, target, names)

  if (hoistToFunction) {
    for (let i = scopes.length - 1; i >= 0; i -= 1) {
      const frame = scopes[i]

      if (!frame.isFunction) {
        continue
      }

      for (const name of names) {
        frame.names.add(name)
      }

      return
    }
  }

  for (const name of names) {
    scopes[scopes.length - 1]?.names.add(name)
  }
}

function isIdentifierInType(ts: TypeScriptApi, node: Ts.Identifier): boolean {
  const parent = node.parent

  if (!parent) {
    return false
  }

  if (ts.isTypeNode(parent)) {
    return true
  }

  if (ts.isTypeElement(parent) || ts.isImportClause(parent) || ts.isImportSpecifier(parent)) {
    return true
  }

  if (ts.isExportSpecifier(parent)) {
    return true
  }

  if (ts.isQualifiedName(parent)) {
    return true
  }

  return false
}

function isIdentifierPropertyName(ts: TypeScriptApi, node: Ts.Identifier): boolean {
  const parent = node.parent

  if (!parent) {
    return false
  }

  if (
    ts.isPropertyAssignment(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent) ||
    ts.isGetAccessorDeclaration(parent) ||
    ts.isSetAccessorDeclaration(parent) ||
    ts.isClassDeclaration(parent) ||
    ts.isClassExpression(parent)
  ) {
    return parent.name === node
  }

  if (ts.isShorthandPropertyAssignment(parent)) {
    return false
  }

  if (ts.isBindingElement(parent)) {
    return parent.propertyName === node
  }

  if (ts.isPropertyAccessExpression(parent)) {
    return parent.name === node
  }

  if (ts.isLabeledStatement(parent)) {
    return parent.label === node
  }

  return false
}

function isPropsDestructurePattern(
  ts: TypeScriptApi,
  declaration: Ts.VariableDeclaration,
  propsName: string,
): boolean {
  if (!ts.isObjectBindingPattern(declaration.name)) {
    return false
  }

  if (!declaration.initializer) {
    return false
  }

  const initializer = unwrapExpression(ts, declaration.initializer)

  return ts.isIdentifier(initializer) && initializer.text === propsName
}

function isShadowed(name: string, scopes: ScopeFrame[]): boolean {
  for (let i = scopes.length - 1; i >= 0; i -= 1) {
    if (scopes[i]?.names.has(name)) {
      return true
    }
  }

  return false
}

function isAssignmentOperatorKind(ts: TypeScriptApi, kind: Ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.EqualsToken ||
    kind === ts.SyntaxKind.PlusEqualsToken ||
    kind === ts.SyntaxKind.MinusEqualsToken ||
    kind === ts.SyntaxKind.AsteriskEqualsToken ||
    kind === ts.SyntaxKind.AsteriskAsteriskEqualsToken ||
    kind === ts.SyntaxKind.SlashEqualsToken ||
    kind === ts.SyntaxKind.PercentEqualsToken ||
    kind === ts.SyntaxKind.LessThanLessThanEqualsToken ||
    kind === ts.SyntaxKind.GreaterThanGreaterThanEqualsToken ||
    kind === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
    kind === ts.SyntaxKind.AmpersandEqualsToken ||
    kind === ts.SyntaxKind.BarEqualsToken ||
    kind === ts.SyntaxKind.CaretEqualsToken ||
    kind === ts.SyntaxKind.BarBarEqualsToken ||
    kind === ts.SyntaxKind.AmpersandAmpersandEqualsToken ||
    kind === ts.SyntaxKind.QuestionQuestionEqualsToken
  )
}

function createReplacementForIdentifier(parameters: {
  ts: TypeScriptApi
  identifier: Ts.Identifier
  sourceFile: Ts.SourceFile
  propsName: string
  propKey: string
}): Replacement | undefined {
  const { ts, identifier, sourceFile, propsName, propKey } = parameters
  const parent = identifier.parent
  const start = identifier.getStart(sourceFile)
  const end = identifier.getEnd()
  let accessText: string

  if (/^[$_a-zA-Z][$_\w]*$/.test(propKey)) {
    accessText = `${propsName}.${propKey}`
  } else if (propKey.startsWith('[') && propKey.endsWith(']')) {
    accessText = `${propsName}${propKey}`
  } else {
    accessText = `${propsName}[${propKey}]`
  }

  if (parent && ts.isShorthandPropertyAssignment(parent) && parent.name === identifier) {
    return {
      start,
      end,
      text: `${identifier.text}: ${accessText}`,
    }
  }

  return {
    start,
    end,
    text: accessText,
  }
}

function collectHoistedBindings(
  ts: TypeScriptApi,
  node: Ts.Node,
  result: Set<string>,
  level: 'root' | 'nested' = 'root',
): void {
  if (ts.isFunctionLike(node) && level === 'nested') {
    return
  }

  if (ts.isFunctionDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
    result.add(node.name.text)
  }

  if (ts.isVariableStatement(node)) {
    const hoistToFunction = (node.declarationList.flags & ts.NodeFlags.BlockScoped) === 0

    if (hoistToFunction) {
      for (const declaration of node.declarationList.declarations) {
        collectBindingNames(ts, declaration.name, result)
      }
    }
  }

  ts.forEachChild(node, (child) => {
    collectHoistedBindings(ts, child, result, 'nested')
  })
}

function emitDiagnostic(
  ctx: TransformContext,
  level: DiagnosticLevel,
  node: Ts.Node,
  message: string,
): void {
  if (level === 'off') {
    return
  }

  const start = node.getStart(ctx.sourceFile)
  const { line, character } = ctx.sourceFile.getLineAndCharacterOfPosition(start)
  const positionText = `${ctx.id}:${line + 1}:${character + 1}`
  const payload = {
    message: `${positionText} ${message}`,
    id: ctx.id,
    pos: start,
  }

  if (level === 'error') {
    ctx.error(payload)
    return
  }

  ctx.warn(payload)
}

function visitFunctionForTransform(
  ctx: TransformContext,
  target: SetupComponentContext,
  replacements: Replacement[],
): void {
  const { ts, sourceFile, diagnostics } = ctx
  const { fn, propsName, bindings, removeRanges, initialReplacements, nestedWarnTargets } = target

  if (bindings.size === 0 && nestedWarnTargets.length === 0) {
    return
  }

  for (const replacement of initialReplacements) {
    replacements.push(replacement)
  }

  for (const warnTarget of nestedWarnTargets) {
    emitDiagnostic(
      ctx,
      diagnostics.watchOrToRef,
      warnTarget,
      `[mini-vue] 仅顶层支持 props 解构，已跳过嵌套位置的解构：${propsName}`,
    )
  }

  const rootScope: ScopeFrame[] = [
    {
      names: new Set<string>(),
      isFunction: true,
    },
  ]

  for (const parameter of fn.parameters) {
    addBindingsToScope(ts, parameter.name, rootScope, true)
  }

  if (fn.body) {
    collectHoistedBindings(ts, fn.body, rootScope[0]?.names ?? new Set())
  }

  for (const name of bindings.keys()) {
    rootScope[0]?.names.delete(name)
  }

  const visit = (node: Ts.Node, scopes: ScopeFrame[]): void => {
    if (isWithinRanges(node.getStart(sourceFile), node.getEnd(), removeRanges)) {
      return
    }

    if (ts.isTypeNode(node)) {
      return
    }

    if (ts.isFunctionLike(node) && node !== fn) {
      if (node.name && ts.isIdentifier(node.name)) {
        addBindingsToScope(ts, node.name, scopes, true)
      }

      const nextScope: ScopeFrame[] = [
        ...scopes,
        {
          names: new Set<string>(),
          isFunction: true,
        },
      ]

      for (const parameter of node.parameters) {
        addBindingsToScope(ts, parameter.name, nextScope, true)
      }

      if ('body' in node && node.body) {
        visit(node.body, nextScope)
      }

      return
    }

    if (ts.isBlock(node) && node !== fn.body) {
      const nextScope: ScopeFrame[] = [
        ...scopes,
        {
          names: new Set<string>(),
          isFunction: false,
        },
      ]

      if (ts.isVariableStatement(node.parent)) {
        // handled in variable declaration branch
      }

      ts.forEachChild(node, (child) => {
        visit(child, nextScope)
      })

      return
    }

    if (ts.isVariableDeclarationList(node)) {
      const hoistToFunction = (node.flags & ts.NodeFlags.BlockScoped) === 0

      for (const declaration of node.declarations) {
        addBindingsToScope(ts, declaration.name, scopes, hoistToFunction)
      }
    } else if (ts.isCatchClause(node)) {
      addBindingsToScope(ts, node.variableDeclaration?.name, scopes, false)
    } else if (ts.isClassLike(node) && node.name && ts.isIdentifier(node.name)) {
      addBindingsToScope(ts, node.name, scopes, true)
    }

    if (
      ts.isIdentifier(node) &&
      bindings.has(node.text) &&
      !isIdentifierInType(ts, node) &&
      !isIdentifierPropertyName(ts, node)
    ) {
      if (!isShadowed(node.text, scopes)) {
        const info = bindings.get(node.text)

        if (!info) {
          return
        }

        const replacement = createReplacementForIdentifier({
          ts,
          identifier: node,
          sourceFile,
          propsName,
          propKey: info.propKey,
        })

        if (replacement) {
          replacements.push(replacement)
        }
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = unwrapExpression(ts, node.expression)

      if (
        ts.isIdentifier(callee) &&
        (ctx.watchLikeLocals.has(callee.text) || ctx.toRefLikeLocals.has(callee.text))
      ) {
        const [firstArg] = node.arguments

        if (
          firstArg &&
          ts.isIdentifier(firstArg) &&
          bindings.has(firstArg.text) &&
          !isShadowed(firstArg.text, scopes)
        ) {
          const info = bindings.get(firstArg.text)

          emitDiagnostic(
            ctx,
            diagnostics.watchOrToRef,
            firstArg,
            `[mini-vue] 直接将 props 解构变量 ${firstArg.text} 传入 ${callee.text}，请改为使用 props.${info?.propKey ?? firstArg.text} 或 getter。`,
          )
        }
      }

      if (
        ts.isIdentifier(callee) &&
        ctx.watchLikeLocals.has(callee.text) &&
        ctx.toRefLikeLocals.has(callee.text)
      ) {
        // no-op, sets are disjoint; keep branch separate for clarity
      }
    }

    if (ts.isBinaryExpression(node)) {
      if (
        ts.isIdentifier(node.left) &&
        bindings.has(node.left.text) &&
        !isShadowed(node.left.text, scopes) &&
        isAssignmentOperatorKind(ts, node.operatorToken.kind)
      ) {
        const info = bindings.get(node.left.text)

        emitDiagnostic(
          ctx,
          diagnostics.write,
          node.left,
          `[mini-vue] 禁止对 props 解构变量 ${node.left.text} 赋值或变更，请直接操作 props.${info?.propKey ?? node.left.text}。`,
        )
      }
    }

    if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
      if (
        (node.operator === ts.SyntaxKind.PlusPlusToken ||
          node.operator === ts.SyntaxKind.MinusMinusToken) &&
        ts.isIdentifier(node.operand) &&
        bindings.has(node.operand.text) &&
        !isShadowed(node.operand.text, scopes)
      ) {
        const info = bindings.get(node.operand.text)

        emitDiagnostic(
          ctx,
          diagnostics.write,
          node.operand,
          `[mini-vue] 禁止对 props 解构变量 ${node.operand.text} 赋值或变更，请直接操作 props.${info?.propKey ?? node.operand.text}。`,
        )
      }
    }

    ts.forEachChild(node, (child) => {
      visit(child, scopes)
    })
  }

  if (fn.body) {
    visit(fn.body, rootScope)
  }

  for (const range of removeRanges) {
    replacements.push({
      start: range.start,
      end: range.end,
      text: '',
    })
  }
}

function collectSetupComponentContexts(ts: TypeScriptApi, sourceFile: Ts.SourceFile): SetupComponentContext[] {
  const contexts: SetupComponentContext[] = []

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) {
      return
    }

    for (const declaration of node.declarationList.declarations) {
      const fn = getSetupComponentFunction(ts, declaration)

      if (!fn) {
        continue
      }

      const hoistedNames = new Set<string>()

      for (const parameter of fn.parameters) {
        collectBindingNames(ts, parameter.name, hoistedNames)
      }

      if (fn.body) {
        collectHoistedBindings(ts, fn.body, hoistedNames)
      }

      const propsInfo = resolvePropsParameter(ts, sourceFile, fn, hoistedNames)

      if (!propsInfo) {
        continue
      }

      const { bindings: paramBindings, propsName, replacement } = propsInfo

      const { bindings: variableBindings, removeRanges, nestedWarnTargets } = collectTopLevelDestructure(
        ts,
        sourceFile,
        fn,
        propsName,
      )

      const bindings = new Map<string, BindingInfo>()

      for (const [key, value] of paramBindings.entries()) {
        bindings.set(key, value)
      }

      for (const [key, value] of variableBindings.entries()) {
        bindings.set(key, value)
      }

      const initialReplacements: Replacement[] = []

      if (replacement) {
        initialReplacements.push(replacement)
      }

      if (bindings.size > 0 || nestedWarnTargets.length > 0) {
        contexts.push({
          fn,
          propsName,
          bindings,
          removeRanges,
          initialReplacements,
          nestedWarnTargets,
        })
      }
    }
  })

  return contexts
}

function resolveWatchToRefLocals(ts: TypeScriptApi, sourceFile: Ts.SourceFile): {
  watch: Set<string>
  toRef: Set<string>
} {
  const watch = new Set<string>(['watch'])
  const toRef = new Set<string>(['toRef'])

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) {
      continue
    }

    const { importClause } = statement

    if (!importClause || !importClause.namedBindings || !ts.isNamedImports(importClause.namedBindings)) {
      continue
    }

    for (const element of importClause.namedBindings.elements) {
      const imported = element.propertyName?.text ?? element.name.text
      const local = element.name.text

      if (imported === 'watch') {
        watch.add(local)
      } else if (imported === 'toRef') {
        toRef.add(local)
      }
    }
  }

  return { watch, toRef }
}

export function miniVueTransformPropsDestructurePlugin(
  options: MiniVueTransformPropsDestructurePluginOptions = {},
): Plugin {
  const diagnostics = {
    ...defaultDiagnostics,
    ...options.diagnostics,
  }

  return {
    name: pluginName,
    enforce: 'pre',
    async transform(code, id) {
      const cleanId = stripQuery(id)
      const isTsx = cleanId.endsWith('.tsx')
      const isTs = cleanId.endsWith('.ts')

      if (!isTs && !isTsx) {
        return
      }

      if (cleanId.endsWith('.d.ts')) {
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
        isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      )
      const { watch, toRef } = resolveWatchToRefLocals(ts, sourceFile)
      const contexts = collectSetupComponentContexts(ts, sourceFile)

      if (contexts.length === 0) {
        return
      }

      const replacements: Replacement[] = []
      const transformCtx: TransformContext = {
        ts,
        sourceFile,
        code,
        diagnostics,
        id: cleanId,
        warn: this.warn,
        error: this.error,
        watchLikeLocals: watch,
        toRefLikeLocals: toRef,
      }

      for (const context of contexts) {
        visitFunctionForTransform(transformCtx, context, replacements)
      }

      if (replacements.length === 0) {
        return
      }

      return {
        code: applyReplacements(code, replacements),
      }
    },
  }
}
