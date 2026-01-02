/**
 * 通用栈式上下文管理器。
 *
 * 本模块提供栈式管理能力，用于追踪嵌套上下文（如 effect、组件实例等）。
 * 通过 push/pop 操作维护调用栈，current 属性始终指向栈顶元素。
 *
 * 典型使用场景：
 * - 响应式系统中追踪当前正在执行的 effect
 * - 组件渲染时追踪当前组件实例
 * - 依赖注入时追踪当前上下文
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
   *
   * @param value - 待压入栈顶的上下文实例
   */
  push(value: T): void {
    this.stack.push(value)
    this.innerCurrent = value
  }

  /**
   * 弹出最近入栈的实例，同时恢复上层上下文。
   *
   * @returns 被弹出的上下文实例；若栈为空则返回 `undefined`
   */
  pop(): T | undefined {
    const popped = this.stack.pop()

    this.innerCurrent = this.stack.at(-1)

    return popped
  }
}
