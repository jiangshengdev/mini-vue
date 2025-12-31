import {
  miniVueDevtoolsTabCategory,
  miniVueDevtoolsTabName,
  miniVueDevtoolsTabTitle,
} from './constants.ts'

interface DevtoolsCustomTabViewSfc {
  type: 'sfc'
  sfc: string
}

interface DevtoolsCustomTab {
  name: string
  title: string
  icon?: string
  view: DevtoolsCustomTabViewSfc
  category?: string
}

const placeholderSfc = /* vue */ `
<script setup lang="ts">
const message = 'Mini Vue Devtools 插件已接入（占位）。'
</script>

<template>
  <div style="padding: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;">
    <h2 style="margin: 0 0 8px; font-size: 16px; font-weight: 600;">Mini Vue</h2>
    <p style="margin: 0; font-size: 13px; opacity: 0.8;">{{ message }}</p>
  </div>
</template>
`

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
    icon: resolveDevtoolsIcon('baseline-extension'),
    view: { type: 'sfc', sfc: placeholderSfc },
    category: miniVueDevtoolsTabCategory,
  }

  ;(tabs as DevtoolsCustomTab[]).push(tab)
}
