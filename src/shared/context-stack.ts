import type { EffectInstance } from '../reactivity/contracts'

/**
 * 提供通用的栈式管理能力，保证嵌套上下文可被精确追踪。
 */
export class ContextStack<T> {
  /**
   * 保存所有入栈的实例，维护调用栈结构。
   */
  private readonly stack: T[] = []

  /**
   * 指向当前正在执行的实例，便于依赖收集阶段引用。
   */
  private innerCurrent: T | undefined

  /**
   * 暴露栈顶实例，供依赖收集阶段读取。
   */
  get current(): T | undefined {
    return this.innerCurrent
  }

  /**
   * 将实例压入栈顶并标记为当前活跃对象。
   */
  push(value: T): void {
    this.stack.push(value)
    this.innerCurrent = value
  }

  /**
   * 弹出最近入栈的实例，同时恢复上层上下文。
   */
  pop(): T | undefined {
    const popped = this.stack.pop()

    this.innerCurrent = this.stack.at(-1)

    return popped
  }
}

export const effectStack = new ContextStack<EffectInstance>()
