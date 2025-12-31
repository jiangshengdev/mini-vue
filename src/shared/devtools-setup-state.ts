import { __DEV__ } from './env.ts'

export type DevtoolsSetupStateKind = 'computed' | 'reactive' | 'ref' | 'unknown'

export interface DevtoolsSetupStateCollector {
  collect: (value: unknown, kind: DevtoolsSetupStateKind) => void
  registerName?: (value: unknown, name: string) => void
}

let currentCollector: DevtoolsSetupStateCollector | undefined
let pausedCollectDepth = 0

export function withDevtoolsSetupStateCollector<T>(
  collector: DevtoolsSetupStateCollector,
  fn: () => T,
): T {
  if (!__DEV__) {
    return fn()
  }

  const previousCollector = currentCollector

  currentCollector = collector

  try {
    return fn()
  } finally {
    currentCollector = previousCollector
  }
}

export function withDevtoolsSetupStateCollectionPaused<T>(fn: () => T): T {
  if (!__DEV__) {
    return fn()
  }

  pausedCollectDepth += 1

  try {
    return fn()
  } finally {
    pausedCollectDepth -= 1
  }
}

export function collectDevtoolsSetupState(value: unknown, kind: DevtoolsSetupStateKind): void {
  if (!__DEV__) {
    return
  }

  if (pausedCollectDepth > 0) {
    return
  }

  currentCollector?.collect(value, kind)
}

export function registerDevtoolsSetupStateName(value: unknown, name: string): void {
  if (!__DEV__) {
    return
  }

  if (!name) {
    return
  }

  if (!value || typeof value !== 'object') {
    return
  }

  currentCollector?.registerName?.(value, name)
}
