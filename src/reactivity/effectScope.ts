/**
 * 将 effect 栈封装为对象，集中管理活跃副作用状态。
 */
import type { ReactiveEffectRunner } from './types.ts'

const effectStack: ReactiveEffectRunner[] = []
let activeEffect: ReactiveEffectRunner | undefined

export const effectScope = {
  push(effect: ReactiveEffectRunner) {
    effectStack.push(effect)
    activeEffect = effect
  },
  pop() {
    effectStack.pop()
    activeEffect = effectStack.at(-1)
  },
  get current(): ReactiveEffectRunner | undefined {
    return activeEffect
  },
}
