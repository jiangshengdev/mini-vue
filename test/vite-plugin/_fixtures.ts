const fixtureModules = import.meta.glob<string>('./fixtures/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function readVitePluginFixture(path: string): string {
  const key = `./fixtures/${path}`
  const raw = fixtureModules[key]

  if (typeof raw !== 'string') {
    throw new TypeError(`未找到 fixture: ${path}`)
  }

  let content = raw

  if (!content.endsWith('\n')) {
    content += '\n'
  }

  return `\n${content}`
}
