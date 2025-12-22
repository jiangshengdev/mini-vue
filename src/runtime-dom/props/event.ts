/** 事件处理器缓存键，挂在宿主元素上保存稳定的 invoker 映射。 */
export const invokerCacheKey = Symbol('invokerCache')

/** 处理 `onXxx` 事件绑定。 */
export function handleEventProp(
  element: Element,
  key: string,
  previous: unknown,
  next: unknown,
): boolean {
  if (!isEventProp(key)) return false

  patchEvent(element as HTMLElement, key.slice(2).toLowerCase(), previous, next)

  return true
}

/**
 * 为事件绑定创建稳定的包装函数，保证增删逻辑复用同一引用。
 */
function patchEvent(
  element: HTMLElement,
  eventName: string,
  _previous: unknown,
  next: unknown,
): void {
  const invokers = getInvokerMap(element)
  const existing = invokers[eventName]

  if (typeof next === 'function') {
    /* 已有 `invoker` 时仅更新内部回调，保证事件引用稳定。 */
    if (existing) {
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
 */
function isEventProp(key: string): boolean {
  return key.startsWith('on') && key.length > 2
}

type EventInvoker = ((event: Event) => void) & { value?: EventListener }

type InvokerMap = Record<string, EventInvoker>
