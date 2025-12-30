import path from 'node:path'
import ts from 'typescript'
import { createSourceFileChecker, getPosition, runTsCheck } from './_shared/ts-check.ts'
import { resolveFromImportMeta } from './_shared/index.ts'

interface Finding {
  filePath: string
  line: number
  column: number
  kind: 'param' | 'variable'
}

const repoRoot = resolveFromImportMeta(import.meta.url, '..', '..')
const playgroundDir = path.resolve(repoRoot, 'playground')
const srcDir = path.resolve(repoRoot, 'src')

function isSetupComponentType(typeNode: ts.TypeNode | undefined): boolean {
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

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current: ts.Expression = expression

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

function getSetupComponentFunction(
  declaration: ts.VariableDeclaration,
): ts.FunctionExpression | ts.ArrowFunction | undefined {
  const { initializer } = declaration
  const typedByDeclaration = isSetupComponentType(declaration.type)

  if (!initializer) {
    return
  }

  const typedByInitializer =
    ts.isAsExpression(initializer) || ts.isSatisfiesExpression(initializer)
      ? isSetupComponentType(initializer.type)
      : false

  if (!typedByDeclaration && !typedByInitializer) {
    return
  }

  const unwrapped = unwrapExpression(initializer)

  if (ts.isFunctionExpression(unwrapped) || ts.isArrowFunction(unwrapped)) {
    return unwrapped
  }
}

function checkParameterDestructure(
  sourceFile: ts.SourceFile,
  fn: ts.FunctionExpression | ts.ArrowFunction,
  findings: Finding[],
  filePath: string,
): string | undefined {
  const firstParameter = fn.parameters[0]

  if (!firstParameter) {
    return
  }

  if (ts.isIdentifier(firstParameter.name)) {
    return firstParameter.name.text
  }

  const { line, column } = getPosition(sourceFile, firstParameter)

  findings.push({
    filePath,
    line,
    column,
    kind: 'param',
  })

  return undefined
}

function isPropsDestructure(node: ts.Node, propsName: string): boolean {
  if (!ts.isVariableDeclaration(node)) {
    return false
  }

  if (!ts.isObjectBindingPattern(node.name) && !ts.isArrayBindingPattern(node.name)) {
    return false
  }

  if (!node.initializer) {
    return false
  }

  const initializer = unwrapExpression(node.initializer)

  return ts.isIdentifier(initializer) && initializer.text === propsName
}

function visitTopLevelForDestructure(parameters: {
  sourceFile: ts.SourceFile
  fn: ts.FunctionExpression | ts.ArrowFunction
  propsName: string
  findings: Finding[]
  filePath: string
}): void {
  const { sourceFile, fn, propsName, findings, filePath } = parameters
  const { body } = fn

  if (!ts.isBlock(body)) {
    return
  }

  const visit = (node: ts.Node, insideNestedFunction: boolean): void => {
    if (isPropsDestructure(node, propsName) && !insideNestedFunction) {
      const { line, column } = getPosition(sourceFile, node)

      findings.push({
        filePath,
        line,
        column,
        kind: 'variable',
      })

      return
    }

    const nextInsideNested = insideNestedFunction || ts.isFunctionLike(node)

    ts.forEachChild(node, (child) => {
      visit(child, nextInsideNested)
    })
  }

  ts.forEachChild(body, (child) => {
    visit(child, false)
  })
}

const checkFile = createSourceFileChecker<Finding>(({ filePath, sourceFile, findings }) => {
  const normalizedPath = path.resolve(filePath)

  ts.forEachChild(sourceFile, (node) => {
    if (!ts.isVariableStatement(node)) {
      return
    }

    for (const declaration of node.declarationList.declarations) {
      const fn = getSetupComponentFunction(declaration)

      if (!fn) {
        continue
      }

      const propsName = checkParameterDestructure(sourceFile, fn, findings, normalizedPath)

      if (!propsName) {
        continue
      }

      visitTopLevelForDestructure({
        sourceFile,
        fn,
        propsName,
        findings,
        filePath: normalizedPath,
      })
    }
  })
})

function formatFinding(finding: Finding): string {
  const positionText = `${finding.filePath}:${finding.line}:${finding.column}`

  if (finding.kind === 'param') {
    return `${positionText} [props-destructure] 禁止在 SetupComponent 参数直接解构 props`
  }

  return `${positionText} [props-destructure] 禁止在 SetupComponent 顶层解构 props（会丢失响应式）`
}

runTsCheck<Finding>({
  dirs: [playgroundDir, srcDir],
  checkFile,
  formatFinding,
  successMessage: 'props 顶层解构检查通过。',
})
