import {
  miniVueDevtoolsTabCategory,
  miniVueDevtoolsTabName,
  miniVueDevtoolsTabTitle,
} from './constants.ts'

interface DevtoolsCustomTabViewIframe {
  type: 'iframe'
  src: string
  persistent?: boolean
}

interface DevtoolsCustomTab {
  name: string
  title: string
  icon?: string
  view: DevtoolsCustomTabViewIframe
  category?: string
}

function createPlaceholderTabSrc(): string {
  /**
   * 注意：Vue Devtools Chrome 扩展（MV3）不允许 `unsafe-eval`。
   * `sfc` 视图依赖运行时编译（`new Function`），会被 CSP 拦截导致面板空白。
   *
   * 因此这里用 `iframe` + `data:` URL 作为最小可用占位实现，避免 eval。
   */
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mini Vue</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
      }

      body {
        margin: 0;
        padding: 12px;
      }

      h2 {
        margin: 0 0 8px;
        font-size: 16px;
        font-weight: 600;
      }

      p {
        margin: 0;
        font-size: 13px;
        opacity: 0.8;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <h2>Mini Vue</h2>
    <p>Hello World</p>
  </body>
</html>`

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

function isUrlString(input: string): boolean {
  try {
    return Boolean(new URL(input))
  } catch {
    return false
  }
}

function resolveDevtoolsIcon(icon?: string): string | undefined {
  if (!icon) {
    return undefined
  }

  if (icon.startsWith('baseline-')) {
    return `custom-ic-${icon}`
  }

  if (icon.startsWith('i-') || isUrlString(icon)) {
    return icon
  }

  return `custom-ic-baseline-${icon}`
}

export function registerMiniVueDevtoolsTab(): void {
  const globalObject = globalThis as {
    __VUE_DEVTOOLS_KIT_CUSTOM_TABS__?: unknown
  }

  const tabs = globalObject.__VUE_DEVTOOLS_KIT_CUSTOM_TABS__

  if (!Array.isArray(tabs)) {
    return
  }

  if (
    tabs.some((tab) => {
      return (tab as { name?: unknown }).name === miniVueDevtoolsTabName
    })
  ) {
    return
  }

  const tab: DevtoolsCustomTab = {
    name: miniVueDevtoolsTabName,
    title: miniVueDevtoolsTabTitle,
    icon: resolveDevtoolsIcon('baseline-dashboard'),
    view: { type: 'iframe', src: createPlaceholderTabSrc() },
    category: miniVueDevtoolsTabCategory,
  }

  ;(tabs as DevtoolsCustomTab[]).push(tab)
}
