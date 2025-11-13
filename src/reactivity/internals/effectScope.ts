/**
 * 将 effect 栈封装为对象，集中管理活跃副作用状态。
 */
import type { ReactiveEffectRunner } from '../shared/types.ts'

/**
 * 维护副作用执行顺序的栈结构。
 */
const effectStack: ReactiveEffectRunner[] = []
/**
 * 指向当前正在执行的副作用，用于依赖收集。
 */
let activeEffect: ReactiveEffectRunner | undefined

export const effectScope = {
  /**
   * 将新的副作用推入栈顶并更新当前活跃 effect。
   */
  push(effect: ReactiveEffectRunner) {
    // 入栈当前 effect，保持执行顺序信息
    effectStack.push(effect)
    // 记录最新活跃的 effect，供依赖收集阶段读取
    activeEffect = effect
  },
  /**
   * 弹出栈顶副作用，并恢复上一层活跃 effect。
   */
  pop() {
    // 弹出已执行完毕的 effect，恢复上层环境
    effectStack.pop()
    // 同步 activeEffect，使其指向新的栈顶
    activeEffect = effectStack.at(-1)
  },
  /**
   * 返回当前处于活跃状态的副作用 runner。
   */
  get current(): ReactiveEffectRunner | undefined {
    return activeEffect
  },
}
