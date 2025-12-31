import { __DEV__ } from './env.ts'

export type DevtoolsSetupStateKind = 'computed' | 'reactive' | 'ref' | 'unknown'

export interface DevtoolsSetupStateCollector {
  collect: (value: unknown, kind: DevtoolsSetupStateKind) => void
}

let currentCollector: DevtoolsSetupStateCollector | undefined

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

export function collectDevtoolsSetupState(value: unknown, kind: DevtoolsSetupStateKind): void {
  if (!__DEV__) {
    return
  }

  currentCollector?.collect(value, kind)
}
