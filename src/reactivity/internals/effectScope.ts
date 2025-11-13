/**
 * 将 effect 栈封装为对象，集中管理活跃副作用状态。
 */
import type { EffectInstance } from '../shared/types.ts'

class EffectScope {
  private readonly stack: EffectInstance[] = []
  private activeEffect: EffectInstance | undefined

  get current(): EffectInstance | undefined {
    return this.activeEffect
  }

  push(effect: EffectInstance) {
    this.stack.push(effect)
    this.activeEffect = effect
  }

  pop() {
    this.stack.pop()
    this.activeEffect = this.stack.at(-1)
  }

  peek(): EffectInstance | undefined {
    return this.stack.at(-1)
  }
}

export const effectScope = new EffectScope()
