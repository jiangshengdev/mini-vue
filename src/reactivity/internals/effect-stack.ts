/**
 * 将 effect 栈封装为对象，集中管理活跃副作用状态。
 */
import type { EffectInstance } from '../shared/types.ts'

/**
 * 提供 effect 嵌套时的栈式管理能力，保证当前活跃副作用可被精确追踪。
 */
class EffectStack {
  /**
   * 保存所有入栈的副作用实例，维护调用栈结构。
   */
  private readonly stack: EffectInstance[] = []

  /**
   * 指向当前正在执行的副作用，便于依赖收集阶段引用。
   */
  private innerCurrent: EffectInstance | undefined

  /**
   * 暴露栈顶副作用，供依赖收集阶段读取。
   */
  get current(): EffectInstance | undefined {
    return this.innerCurrent
  }

  /**
   * 将副作用压入栈顶并标记为当前活跃对象。
   */
  push(effect: EffectInstance): void {
    this.stack.push(effect)
    this.innerCurrent = effect
  }

  /**
   * 弹出最近入栈的副作用，同时恢复上层上下文。
   */
  pop(): void {
    this.stack.pop()
    this.innerCurrent = this.stack.at(-1)
  }
}

export const effectStack = new EffectStack()
