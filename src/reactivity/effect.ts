import {
  popActiveEffect,
  pushActiveEffect,
  type ReactiveEffectRunner,
  type Dep,
} from './operations.ts'

/**
 * 清理 runner 与已收集依赖的关联，确保下次收集时不会重复保留旧依赖。
 */
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
  // 将可执行函数与依赖容器组装到同一对象，便于后续清理
  const runner = Object.assign(
    function reactiveEffectRunner() {
      cleanupEffect(runner)
      pushActiveEffect(runner)
      try {
        return fn()
      } finally {
        popActiveEffect()
      }
    },
    { deps: [] as Dep[] },
  ) satisfies ReactiveEffectRunner<T>

  runner()
  return runner
}
