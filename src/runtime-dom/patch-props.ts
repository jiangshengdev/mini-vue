/**
 * DOM 专用的属性打补丁逻辑，负责将 `virtualNode` `props` 应用到真实元素上。
 */
import { normalizeClass } from './normalize-class.ts'
import { runtimeDomInvalidStyleValue, runtimeDomUnsupportedAttrValue } from '@/messages/index.ts'
import type { Ref } from '@/reactivity/index.ts'
import { isRef } from '@/reactivity/index.ts'
import type { PropsShape } from '@/shared/index.ts'
import { __DEV__, isNil, isObject } from '@/shared/index.ts'

/**
 * @beta
 */
export type ElementRef = ((element: Element | undefined) => void) | Ref<Element | undefined>

/** 扩展原生 `style` 声明，允许对任意属性键执行写入。 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>

/** 写入单个样式属性，兼容标准属性名与自定义属性名。 */
function setStyleValue(element: HTMLElement, property: string, input: string): void {
  if (Reflect.has(element.style, property)) {
    ;(element.style as WritableStyle)[property] = input
  } else {
    element.style.setProperty(property, input)
  }
}

/**
 * 检测 `props` key 是否表示事件绑定（如 `onClick`/`oninput`）。
 */
function isEventProp(key: string): boolean {
  return key.startsWith('on') && key.length > 2
}

/**
 * 将 `virtualNode` 上的 `props` 映射到真实 DOM 元素上。
 */
export function patchProps(
  element: Element,
  previousProps?: PropsShape,
  nextProps?: PropsShape,
): void {
  const previous = previousProps ?? {}
  const next = nextProps ?? {}
  /* 同步遍历前后所有 `prop` `key`，确保新增与删除都被覆盖。 */
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])

  for (const key of keys) {
    const previousValue = previous[key]
    const nextValue = next[key]

    /* `ref` 交由 `runtime-core` 处理，这里直接跳过保持职责单一。 */
    if (key === 'ref' && (isElementRef(previousValue) || isElementRef(nextValue))) {
      continue
    }

    /* `class`/`className` 统一走归一化逻辑，`null`/`false` 时直接清空。 */
    if (key === 'class' || key === 'className') {
      if (isNil(nextValue) || nextValue === false) {
        ;(element as HTMLElement).className = ''
      } else {
        ;(element as HTMLElement).className = normalizeClass(nextValue)
      }

      continue
    }

    if (key === 'style') {
      applyStyle(element as HTMLElement, previousValue, nextValue)
      continue
    }

    /* 多选 `select` 允许数组值，直接写 DOM property 控制选中项。 */
    if (
      key === 'value' &&
      element instanceof HTMLSelectElement &&
      Array.isArray(nextValue ?? previousValue)
    ) {
      applySelectValue(element, nextValue)
      continue
    }

    /* 受控表单：`value`/`checked` 应写 DOM property，确保 UI 同步。 */
    if (key === 'value' && element instanceof HTMLInputElement) {
      element.value = isNil(nextValue) ? '' : (nextValue as string)
      continue
    }

    if (key === 'value' && element instanceof HTMLTextAreaElement) {
      element.value = isNil(nextValue) ? '' : (nextValue as string)
      continue
    }

    if (key === 'value' && element instanceof HTMLSelectElement) {
      element.value = isNil(nextValue) ? '' : (nextValue as string)
      continue
    }

    if (key === 'checked' && element instanceof HTMLInputElement) {
      element.checked = Boolean(nextValue)
      continue
    }

    /* 事件以 `onXxx` 开头，统一做小写映射后注册。 */
    if (isEventProp(key)) {
      patchEvent(element as HTMLElement, key.slice(2).toLowerCase(), previousValue, nextValue)
      continue
    }

    patchDomAttr(element, key, nextValue)
  }
}

/**
 * 处理 `style` 属性，支持字符串和对象两种写法。
 */
function applyStyle(element: HTMLElement, previous: unknown, next: unknown): void {
  if (isNil(next) || next === false) {
    element.removeAttribute('style')

    return
  }

  if (typeof next === 'string') {
    element.setAttribute('style', next)

    return
  }

  if (isObject(next)) {
    const nextStyle = next as Record<string, unknown>

    /* 所有属性都为 `null`/`undefined` 时移除整个 `style`，避免空标记残留。 */
    if (
      Object.values(nextStyle).every((item) => {
        return isNil(item)
      })
    ) {
      element.removeAttribute('style')

      /* Playwright 浏览器下偶发保留空 `style` 特性，显式清空后再移除确保属性消失。 */
      if (element.getAttribute('style') !== null) {
        element.style.cssText = ''
        element.removeAttribute('style')
      }

      return
    }

    const previousStyle = isObject(previous) ? (previous as Record<string, unknown>) : {}
    let hasValue = false

    /* 先处理删除：前一版本存在但当前已移除或置空的键需写入空字符串。 */
    for (const name of Object.keys(previousStyle)) {
      if (!Object.hasOwn(nextStyle, name) || isNil(nextStyle[name])) {
        setStyleValue(element, name, '')
      }
    }

    /* 再处理新增/更新：仅接受 `string` 或 `number`，其他类型开发态发出警告。 */
    for (const [name, styleValue] of Object.entries(nextStyle)) {
      if (isNil(styleValue)) {
        setStyleValue(element, name, '')

        continue
      }

      if (typeof styleValue !== 'string' && typeof styleValue !== 'number') {
        if (__DEV__) {
          console.warn(runtimeDomInvalidStyleValue(name, typeof styleValue), styleValue)
        }

        continue
      }

      const stringValue: string = typeof styleValue === 'number' ? String(styleValue) : styleValue

      setStyleValue(element, name, stringValue)
      hasValue = true
    }

    /* 对象写法未留下有效值时移除 `style` 特性，保持与空对象等价。 */
    if (!hasValue) {
      element.removeAttribute('style')
    }
  }
}

/**
 * 处理普通 DOM 属性，包括布尔属性的存在性表达。
 */
function patchDomAttr(element: Element, key: string, value: unknown): void {
  /* `null`/`false` 都表示属性应被移除。 */
  if (isNil(value) || value === false) {
    element.removeAttribute(key)

    return
  }

  /* 布尔 `true` 直接写入空字符串，符合 HTML 布尔属性语义。 */
  if (value === true) {
    element.setAttribute(key, '')

    return
  }

  /* 仅接受 `string` 或 `number`，其他类型直接忽略写入。 */
  if (typeof value === 'string' || typeof value === 'number') {
    element.setAttribute(key, String(value))

    return
  }

  if (__DEV__) {
    console.warn(runtimeDomUnsupportedAttrValue(key, typeof value), value)
  }
}

/**
 * 为多选 `select` 应用数组值，按严格等于匹配选中项。
 */
function applySelectValue(element: HTMLSelectElement, value: unknown): void {
  if (!Array.isArray(value)) {
    if (isNil(value)) {
      element.value = ''
    } else if (typeof value === 'string' || typeof value === 'number') {
      element.value = String(value)
    } else {
      if (__DEV__) {
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof value), value)
      }

      element.value = ''
    }

    return
  }

  const values = value as unknown[]

  if (!element.multiple) {
    const first = values[0]

    if (isNil(first)) {
      element.value = ''
    } else if (typeof first === 'string' || typeof first === 'number') {
      element.value = String(first)
    } else {
      if (__DEV__) {
        console.warn(runtimeDomUnsupportedAttrValue('value', typeof first), first)
      }

      element.value = ''
    }

    return
  }

  const normalizedValues = new Set(values)

  queueMicrotask(() => {
    const options = [...element.options]

    for (const option of options) {
      option.selected = normalizedValues.has(option.value)
    }
  })
}

/** 判断传入值是否为元素 `ref` 处理器或响应式 `ref`。 */
function isElementRef(value: unknown): value is ElementRef {
  return typeof value === 'function' || isRef<Element | undefined>(value)
}

type EventInvoker = ((event: Event) => void) & { value?: EventListener }

/** 事件处理器缓存键，挂在宿主元素上保存稳定的 invoker 映射。 */
export const invokerCacheKey = Symbol('invokerCache')

type InvokerMap = Record<string, EventInvoker>

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
