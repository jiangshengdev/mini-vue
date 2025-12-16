import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

export interface Position {
  line: number
  column: number
}

export function readTsSourceFile(filePath: string): ts.SourceFile {
  const sourceText = fs.readFileSync(filePath, 'utf8')

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
}

export function getPosition(sourceFile: ts.SourceFile, node: ts.Node): Position {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

  return { line: line + 1, column: character + 1 }
}

export function listTsFilesInDir(parameters: {
  dirPath: string
  extensions?: string[]
  includeGlobs?: string[]
  filter?: (filePath: string) => boolean
}): string[] {
  const { dirPath, extensions = ['.ts', '.tsx'], includeGlobs = ['**/*'], filter } = parameters

  const files = ts.sys.readDirectory(dirPath, extensions, undefined, includeGlobs)
  const finalFilter =
    filter ??
    (() => {
      return true
    })

  return files.filter((filePath) => {
    return finalFilter(filePath)
  })
}

export function getBoundaryDir(parameters: {
  srcDir: string
  filePath: string
}): string | undefined {
  const { srcDir, filePath } = parameters
  const relative = path.relative(srcDir, filePath)

  if (!relative || relative.startsWith('..')) {
    return
  }

  const parts = relative.split(path.sep).filter(Boolean)

  // Src 顶层文件（例如 src/index.ts）不属于任何一级目录边界
  if (parts.length < 2) {
    return
  }

  return parts[0]
}

export function runSrcCheck<Finding>(parameters: {
  srcDir: string
  checkFile: (filePath: string, findings: Finding[]) => void
  formatFinding: (finding: Finding) => string
  successMessage: string
  missingSrcMessage?: string
  filter?: (filePath: string) => boolean
}): void {
  const { srcDir, checkFile, formatFinding, successMessage, missingSrcMessage, filter } = parameters

  if (!fs.existsSync(srcDir)) {
    console.error(missingSrcMessage ?? `src directory not found at ${srcDir}`)
    process.exitCode = 1

    return
  }

  const files = listTsFilesInDir({
    dirPath: srcDir,
    filter(filePath) {
      if (filePath.endsWith('.d.ts')) {
        return false
      }

      return filter ? filter(filePath) : true
    },
  })

  const findings: Finding[] = []

  for (const filePath of files) {
    checkFile(filePath, findings)
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(formatFinding(finding))
    }

    process.exitCode = 1

    return
  }

  console.log(successMessage)
}
