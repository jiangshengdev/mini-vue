import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const sourcePath = resolve(projectRoot, 'src/jsx/jsx-shim.d.ts')
const targetDir = resolve(projectRoot, 'dist/jsx')
const targetPath = resolve(targetDir, 'index.d.ts')

const importStripPattern = /^import type\s+{[^}]+}\s+from\s+'@\/[^']+'\s*$\n?/gm

async function ensureSourceExists() {
  try {
    await access(sourcePath)
  } catch {
    throw new Error('未找到 src/jsx/jsx-shim.d.ts，无法生成 JSX 类型声明')
  }
}

async function resolvePackageName() {
  const packageJsonPath = resolve(projectRoot, 'package.json')
  const packageRaw = await readFile(packageJsonPath, 'utf8')
  const { name } = JSON.parse(packageRaw)

  if (!name) {
    throw new Error('package.json 缺少 name 字段，无法生成 JSX 类型引用路径')
  }

  return name
}

function prepareShimContent(rawContent: string, packageName: string) {
  const stripped = rawContent.replaceAll(importStripPattern, '')
  const normalizedBody = stripped.replace(/^\n+/, '')
  const headerImport = `import type { ElementRef, ElementType as MiniElementType, PropsShape, VirtualNode } from '${packageName}'\n\n`
  const result = `${headerImport}${normalizedBody}`

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

generateShim().catch((error) => {
  console.error('[generate-jsx-shim] 生成 JSX shim 失败：')
  console.error(error)
  process.exit(1)
})
