/**
 * DOM 专用的属性打补丁逻辑，负责将 virtualNode props 应用到真实元素上。
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

/** 扩展原生 style 声明，允许对任意属性键执行写入。 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>

function setStyleValue(element: HTMLElement, property: string, input: string): void {
  if (Reflect.has(element.style, property)) {
    ;(element.style as WritableStyle)[property] = input
  } else {
    element.style.setProperty(property, input)
  }
}

/**
 * 检测 props key 是否表示事件绑定（如 onClick/oninput）。
 */
function isEventProp(key: string): boolean {
  return key.startsWith('on') && key.length > 2
}

/**
 * 将 virtualNode 上的 props 映射到真实 DOM 元素上。
 */
export function patchProps(
  element: Element,
  previousProps?: PropsShape,
  nextProps?: PropsShape,
): void {
  const previous = previousProps ?? {}
  const next = nextProps ?? {}
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])

  for (const key of keys) {
    const previousValue = previous[key]
    const nextValue = next[key]

    if (key === 'ref' && (isElementRef(previousValue) || isElementRef(nextValue))) {
      continue
    }

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

    if (isEventProp(key)) {
      patchEvent(element as HTMLElement, key.slice(2).toLowerCase(), previousValue, nextValue)
      continue
    }

    patchDomAttr(element, key, nextValue)
  }
}

/**
 * 处理 style 属性，支持字符串和对象两种写法。
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
    if (Object.values(nextStyle).every(isNil)) {
      element.removeAttribute('style')

      if (element.getAttribute('style') !== null) {
        element.style.cssText = ''
        element.removeAttribute('style')
      }

      return
    }

    const previousStyle = isObject(previous) ? (previous as Record<string, unknown>) : {}
    let hasValue = false

    for (const name of Object.keys(previousStyle)) {
      if (!Object.hasOwn(nextStyle, name) || isNil(nextStyle[name])) {
        setStyleValue(element, name, '')
      }
    }

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

  /* 布尔 true 直接写入空字符串，符合 HTML 布尔属性语义。 */
  if (value === true) {
    element.setAttribute(key, '')

    return
  }

  /* 仅接受字符串或数字，其他类型直接忽略写入。 */
  if (typeof value === 'string' || typeof value === 'number') {
    element.setAttribute(key, String(value))

    return
  }

  if (__DEV__) {
    console.warn(runtimeDomUnsupportedAttrValue(key, typeof value), value)
  }
}

function isElementRef(value: unknown): value is ElementRef {
  return typeof value === 'function' || isRef<Element | undefined>(value)
}

type EventInvoker = ((event: Event) => void) & { value?: EventListener }

const invokerCacheKey = '__miniVueInvokers__'

function patchEvent(
  element: HTMLElement,
  eventName: string,
  _previous: unknown,
  next: unknown,
): void {
  const invokers = getInvokerMap(element)
  const existing = invokers[eventName]

  if (typeof next === 'function') {
    if (existing) {
      existing.value = next as EventListener
    } else {
      const invoker: EventInvoker = (event) => {
        invoker.value?.(event)
      }

      invoker.value = next as EventListener
      invokers[eventName] = invoker
      element.addEventListener(eventName, invoker)
    }

    return
  }

  if (existing) {
    element.removeEventListener(eventName, existing)
    Reflect.deleteProperty(invokers, eventName)
  }
}

function getInvokerMap(element: HTMLElement): Record<string, EventInvoker> {
  const record = (element as HTMLElement & { [invokerCacheKey]?: Record<string, EventInvoker> })[
    invokerCacheKey
  ]

  if (record) {
    return record
  }

  const next: Record<string, EventInvoker> = {}

  ;(element as HTMLElement & { [invokerCacheKey]?: Record<string, EventInvoker> })[
    invokerCacheKey
  ] = next

  return next
}
