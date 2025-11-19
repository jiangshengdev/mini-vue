/**
 * DOM 专用的属性打补丁逻辑，负责将 virtualNode props 应用到真实元素上。
 */
import { isNil } from '@/shared/utils.ts'

export type ElementRef = (element: Element) => void

/** 扩展原生 style 声明，允许对任意属性键执行写入。 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | undefined>

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
  props?: Record<string, unknown>,
): void {
  if (!props) {
    return
  }

  for (const [key, value] of Object.entries(props)) {
    /* `ref` 需要拿到真实元素，因此直接执行用户回调。 */
    if (key === 'ref' && isElementRef(value)) {
      value(element)
      continue
    }

    /* `class`/`className` 统一走 `className`，确保字符串化处理。 */
    if (key === 'class' || key === 'className') {
      element.className = isNil(value) ? '' : String(value)
      continue
    }

    /* `style` 允许字符串与对象写法，交给专门逻辑处理。 */
    if (key === 'style') {
      applyStyle(element as HTMLElement, value)
      continue
    }

    /* 事件 props 统一转为小写事件名并绑定监听器。 */
    if (isEventProp(key) && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase()

      element.addEventListener(eventName, value as EventListener)
      continue
    }

    /* 剩余场景一律按普通 DOM 属性写入或移除。 */
    patchDomAttr(element, key, value)
  }
}

/**
 * 处理 style 属性，支持字符串和对象两种写法。
 */
function applyStyle(element: HTMLElement, value: unknown): void {
  /* 空值表示完全移除 style，避免残留样式。 */
  if (isNil(value) || value === false) {
    element.removeAttribute('style')

    return
  }

  /* 字符串形式直接透传给 style attribute。 */
  if (typeof value === 'string') {
    element.setAttribute('style', value)

    return
  }

  /* 对象形式逐项设置：优先走属性写入，不支持的属性退回 setProperty。 */
  if (typeof value === 'object') {
    for (const [name, styleValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const resolved = styleValue ?? ''

      /* 支持的内联属性直接赋值，可避免多余字符串拼接。 */
      if (name in element.style) {
        ;(element.style as WritableStyle)[name] = String(resolved)
      } else {
        /* 非声明属性使用 setProperty，兼容 CSS 自定义变量等场景。 */
        element.style.setProperty(name, String(resolved))
      }
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

  /* 其他值一律字符串化后写入。 */
  element.setAttribute(key, String(value))
}

function isElementRef(value: unknown): value is ElementRef {
  return typeof value === 'function'
}
