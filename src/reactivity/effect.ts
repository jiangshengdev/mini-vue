import {
  popActiveEffect,
  pushActiveEffect,
  type ReactiveEffectRunner,
} from './operations.ts'

function cleanupEffect(effect: ReactiveEffectRunner) {
  for (const dep of effect.deps) {
    dep.delete(effect)
  }
  effect.deps.length = 0
}

/**
 * 最小版 effect：立即执行副作用函数并返回 runner，可手动触发。
 */
export function effect<T>(fn: () => T): ReactiveEffectRunner<T> {
  const runner = function reactiveEffectRunner() {
    cleanupEffect(runner)
    pushActiveEffect(runner)
    try {
      return fn()
    } finally {
      popActiveEffect()
    }
  } as ReactiveEffectRunner<T>

  runner.deps = []
  runner()
  return runner
}
