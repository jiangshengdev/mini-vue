import { effectScope } from './internals/effectScope.ts'
import type { Dep, ReactiveEffectRunner } from './shared/types.ts'

/**
 * 清理 runner 与已收集依赖的关联，确保下次收集时不会重复保留旧依赖。
 */
function cleanupEffect(effect: ReactiveEffectRunner) {
  // 逐个遍历当前 runner 记录的依赖集合，解除双向引用
  for (const dep of effect.deps) {
    detachEffectFrom(dep, effect)
  }
  // 清空依赖列表，确保下一次收集从干净状态开始
  effect.deps.length = 0
}

/**
 * 移除依赖集合中指定的副作用函数。
 */
function detachEffectFrom(dep: Dep, effect: ReactiveEffectRunner) {
  dep.delete(effect)
}

/**
 * 最小版 effect：立即执行副作用函数并返回 runner，可手动触发。
 */
export function effect<T>(fn: () => T): ReactiveEffectRunner<T> {
  // 将可执行函数与依赖容器组装到同一对象，便于后续清理
  const runner = Object.assign(
    function reactiveEffectRunner() {
      // 运行前先清理上一次残留的依赖关系
      cleanupEffect(runner)
      // 将当前 runner 入栈，供 track 获取活跃副作用
      effectScope.push(runner)
      try {
        return fn()
      } finally {
        // 始终恢复 effect 栈状态，避免嵌套 effect 异常
        effectScope.pop()
      }
    },
    { deps: [] as Dep[] },
  ) satisfies ReactiveEffectRunner<T>

  // 首次调用以完成依赖收集，返回可复用的 runner
  runner()
  return runner
}
