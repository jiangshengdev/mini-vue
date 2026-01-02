/**
 * 事件绑定处理模块。
 *
 * 本模块负责将 `onXxx` 形式的 props 绑定到 DOM 事件监听器，核心策略：
 * - 使用 invoker 包装函数保持事件监听引用稳定，避免频繁 add/remove
 * - invoker 缓存挂在元素上，通过 `invokerCacheKey` Symbol 访问
 * - 更新时仅替换 invoker 内部的 `value` 回调，无需重新绑定监听器
 */

/** 事件处理器缓存键，挂在宿主元素上保存稳定的 invoker 映射。 */
export const invokerCacheKey = Symbol('invokerCache')

/**
 * 处理 `onXxx` 事件绑定。
 *
 * @param element - 目标 DOM 元素
 * @param key - 属性名，如 `onClick`、`onInput`
 * @param previous - 上一次的事件处理器
 * @param next - 本次的事件处理器
 * @returns 是否已处理该属性（`true` 表示已处理，调用方应跳过后续逻辑）
 */
export function handleEventProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (!isEventProp(key)) {
    return false
  }

  patchEvent(element as HTMLElement, key.slice(2).toLowerCase(), previous, next)

  return true
}

/**
 * 为事件绑定创建或更新稳定的包装函数（invoker）。
 *
 * 策略：
 * - 首次绑定时创建 invoker 并注册监听器
 * - 后续更新仅替换 invoker.value，保持监听引用稳定
 * - 传入非函数值时移除监听器并清理缓存
 *
 * @param element - 目标 DOM 元素
 * @param eventName - 小写事件名，如 `click`、`input`
 * @param _previous - 上一次的事件处理器（未使用，保留参数位置）
 * @param next - 本次的事件处理器
 */
function patchEvent(
  element: HTMLElement,
  eventName: string,
  _previous: unknown,
  next: unknown,
): void {
  /* 为当前元素取出或初始化 `invoker` 缓存，保证事件处理引用可复用。 */
  const invokers = getInvokerMap(element)
  const existing = invokers[eventName]

  if (typeof next === 'function') {
    /* 已有 `invoker` 时仅更新内部回调，保证事件引用稳定。 */
    if (existing) {
      if (existing.value === next) {
        return
      }

      existing.value = next as EventListener
    } else {
      /* 首次绑定时创建包装 `invoker`，后续更新直接覆写 `value`。 */
      const invoker: EventInvoker = (event) => {
        invoker.value?.(event)
      }

      invoker.value = next as EventListener
      invokers[eventName] = invoker
      element.addEventListener(eventName, invoker)
    }

    return
  }

  /* 非 `function` 值代表需要移除事件监听。 */
  if (existing) {
    element.removeEventListener(eventName, existing)
    Reflect.deleteProperty(invokers, eventName)
  }
}

/**
 * 获取或初始化当前元素的事件 `invoker` 映射，避免多次创建对象。
 *
 * @param element - 宿主元素
 * @returns 当前元素上的 invoker 映射表
 */
function getInvokerMap(element: HTMLElement): InvokerMap {
  const record = (element as HTMLElement & { [invokerCacheKey]?: InvokerMap })[invokerCacheKey]

  if (record) {
    return record
  }

  const next: InvokerMap = {}

  ;(element as HTMLElement & { [invokerCacheKey]?: InvokerMap })[invokerCacheKey] = next

  return next
}

/**
 * 检测 `props` key 是否表示事件绑定（如 `onClick`/`oninput`）。
 *
 * @param key - props 键名
 * @returns 是否符合事件前缀约定
 */
function isEventProp(key: string): boolean {
  return key.startsWith('on') && key.length > 2
}

/** 事件包装函数类型，持有当前有效的真实回调。 */
type EventInvoker = ((event: Event) => void) & { value?: EventListener }

/** 事件名到 invoker 的映射表，挂在元素上复用。 */
type InvokerMap = Record<string, EventInvoker>
