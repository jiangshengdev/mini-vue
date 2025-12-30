import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

interface RunAllOptions {
  emptyMessage: string
}

function isRunnableScript(filePath: string): boolean {
  if (!filePath.endsWith('.ts')) {
    return false
  }

  // 约定：_shared 仅放置工具模块，不应作为独立检查脚本执行
  if (filePath.split(path.sep).includes('_shared')) {
    return false
  }

  const base = path.basename(filePath)

  if (base === 'run.ts') {
    return false
  }

  if (base.endsWith('.d.ts')) {
    return false
  }

  return true
}

function listScripts(dirPath: string): string[] {
  const files = ts.sys.readDirectory(dirPath, ['.ts'], undefined, ['**/*.ts'])

  return files
    .filter((filePath) => {
      return isRunnableScript(filePath)
    })
    .sort((a, b) => {
      return a.localeCompare(b)
    })
}

function runScript(filePath: string): number {
  const result = spawnSync(process.execPath, [filePath], { stdio: 'inherit' })

  if (typeof result.status === 'number') {
    return result.status
  }

  return 1
}

export function runAllScriptsInDir(dirPath: string, options: RunAllOptions): void {
  const scripts = listScripts(dirPath)

  if (scripts.length === 0) {
    console.log(options.emptyMessage)

    return
  }

  let hasFailure = false

  for (const scriptPath of scripts) {
    const exitCode = runScript(scriptPath)

    if (exitCode !== 0) {
      hasFailure = true
    }
  }

  if (hasFailure) {
    process.exitCode = 1
  }
}
