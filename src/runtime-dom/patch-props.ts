/**
 * DOM 专用的属性打补丁逻辑，负责将 virtualNode props 差量应用到真实元素上。
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

/**
 * 事件 invoker 接口，包装真实事件处理器以支持热更新。
 */
interface Invoker extends EventListener {
  /** 当前绑定的事件处理函数，触发时调用。 */
  value: EventListener
}

/** 元素上缓存的事件 invoker 映射，key 为小写事件名。 */
const invokerCache = new WeakMap<Element, Map<string, Invoker>>()

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
 * 提取事件 prop key 的小写事件名（onClick → click）。
 */
function getEventName(key: string): string {
  return key.slice(2).toLowerCase()
}

/**
 * 获取或创建元素的 invoker 缓存 Map。
 */
function getInvokerMap(element: Element): Map<string, Invoker> {
  let map = invokerCache.get(element)

  if (!map) {
    map = new Map<string, Invoker>()
    invokerCache.set(element, map)
  }

  return map
}

/**
 * 将 virtualNode 上的 props 差量映射到真实 DOM 元素上。
 * mount 时 prevProps 为 undefined，表示全部应用 nextProps。
 */
export function patchProps(
  element: Element,
  prevProps?: PropsShape,
  nextProps?: PropsShape,
): void {
  /* 兼容旧签名：若只传了 prevProps，视为 nextProps 使用。 */
  if (prevProps !== undefined && nextProps === undefined) {
    nextProps = prevProps
    prevProps = undefined
  }

  const prev = prevProps ?? {}
  const next = nextProps ?? {}

  /* 遍历 nextProps，添加或更新所有字段。 */
  for (const key of Object.keys(next)) {
    const prevValue = prev[key]
    const nextValue = next[key]

    /* 值未变化时跳过（浅比较）。 */
    if (prevValue === nextValue) {
      continue
    }

    patchProp(element, key, prevValue, nextValue)
  }

  /* 遍历 prevProps，移除 nextProps 中缺失的字段。 */
  for (const key of Object.keys(prev)) {
    if (!(key in next)) {
      patchProp(element, key, prev[key], undefined)
    }
  }
}

/**
 * 处理单个 prop 的添加、更新或移除。
 */
function patchProp(element: Element, key: string, prevValue: unknown, nextValue: unknown): void {
  /* `ref` 由挂载流程统一处理，跳过。 */
  if (key === 'ref' && (isElementRef(prevValue) || isElementRef(nextValue))) {
    return
  }

  /* `class`/`className` 统一走 `className`，归一化复杂写法。 */
  if (key === 'class' || key === 'className') {
    patchClass(element, nextValue)

    return
  }

  /* `style` 允许字符串与对象写法，交给专门逻辑处理。 */
  if (key === 'style') {
    patchStyle(element as HTMLElement, prevValue, nextValue)

    return
  }

  /* 事件 props 通过 invoker 机制管理。 */
  if (isEventProp(key)) {
    patchEvent(element, key, prevValue, nextValue)

    return
  }

  /* 剩余场景一律按普通 DOM 属性写入或移除。 */
  patchDomAttr(element, key, nextValue)
}

/**
 * 处理 class 属性的更新。
 */
function patchClass(element: Element, value: unknown): void {
  element.className = normalizeClass(value)
}

/**
 * 处理 style 属性的差量更新。
 */
function patchStyle(element: HTMLElement, prevValue: unknown, nextValue: unknown): void {
  /* nextValue 为空值时完全移除 style。 */
  if (isNil(nextValue) || nextValue === false) {
    element.removeAttribute('style')

    return
  }

  /* 字符串形式直接透传给 style attribute。 */
  if (typeof nextValue === 'string') {
    element.setAttribute('style', nextValue)

    return
  }

  /* 对象形式需要差量处理。 */
  if (isObject(nextValue)) {
    const nextStyle = nextValue as Record<string, unknown>

    /* 若 prevValue 也是对象，移除 nextValue 中不存在的样式属性。 */
    if (isObject(prevValue)) {
      const prevStyle = prevValue as Record<string, unknown>

      for (const name of Object.keys(prevStyle)) {
        if (!(name in nextStyle)) {
          setStyleValue(element, name, '')
        }
      }
    }

    /* 应用 nextValue 中的所有样式。 */
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
    }
  }
}

/**
 * 处理事件监听器的添加、更新或移除。
 * 使用 invoker 模式避免重复添加/移除监听器。
 */
function patchEvent(element: Element, key: string, prevValue: unknown, nextValue: unknown): void {
  const invokerMap = getInvokerMap(element)
  const eventName = getEventName(key)
  const existingInvoker = invokerMap.get(eventName)

  /* nextValue 是函数时更新或创建 invoker。 */
  if (typeof nextValue === 'function') {
    if (existingInvoker) {
      /* 复用已有 invoker，仅更新 value。 */
      existingInvoker.value = nextValue as EventListener
    } else {
      /* 创建新 invoker 并绑定到元素。 */
      const invoker: Invoker = (event: Event) => {
        invoker.value(event)
      }

      invoker.value = nextValue as EventListener
      invokerMap.set(eventName, invoker)
      element.addEventListener(eventName, invoker)
    }
  } else if (existingInvoker) {
    /* nextValue 不是函数且存在 invoker 时移除监听器。 */
    element.removeEventListener(eventName, existingInvoker)
    invokerMap.delete(eventName)
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
