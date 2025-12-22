import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'

const DOCS_ROOT = fileURLToPath(new URL('../', import.meta.url))

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Mini Vue',
  description: 'A VitePress Site',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Issues', link: '/issues' },
      { text: 'Wiki', link: '/wiki' },
    ],

    sidebar: buildSidebar(),

    socialLinks: [{ icon: 'github', link: 'https://github.com/jiangshengdev/mini-vue' }],
  },
  markdown: {
    math: true,
  },
})

function buildSidebar() {
  const entries = readdirSync(DOCS_ROOT, { withFileTypes: true })
  const sections = []

  const compareSidebarEntries = (a: { name: string }, b: { name: string }) => {
    if (a.name === 'index.md') {
      return -1
    }

    if (b.name === 'index.md') {
      return 1
    }

    return a.name.localeCompare(b.name)
  }

  const rootItems = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md')
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => createSidebarItem(join(DOCS_ROOT, entry.name)))

  if (rootItems.length > 0) {
    sections.push({ text: '文档', items: rootItems })
  }

  entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .forEach((dir) => {
      const dirPath = join(DOCS_ROOT, dir.name)
      const dirItems = readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .sort(compareSidebarEntries)
        .map((entry) => createSidebarItem(join(dirPath, entry.name)))

      if (dirItems.length > 0) {
        sections.push({ text: dir.name, items: dirItems })
      }
    })

  return sections
}

function createSidebarItem(filePath: string) {
  const text = readFirstHeading(filePath) ?? basename(filePath, '.md')

  return {
    text,
    link: toLink(relative(DOCS_ROOT, filePath)),
  }
}

function readFirstHeading(filePath: string) {
  const content = readFileSync(filePath, 'utf-8')
  const headingMatch = content.match(/^#\s+(.+)$/m)

  return headingMatch?.[1]?.trim()
}

function toLink(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/')

  if (normalized.endsWith('/index.md')) {
    const base = normalized.slice(0, -'/index.md'.length)

    return base ? `/${base}` : '/'
  }

  const trimmed = normalized.replace(/\.md$/, '')

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}
