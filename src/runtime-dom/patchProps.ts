/**
 * DOM 专用的属性打补丁逻辑，负责将 VNode props 应用到真实元素上。
 */
type WritableStyle = CSSStyleDeclaration & Record<string, string | null>

function isEventProp(key: string) {
  return key.startsWith('on') && key.length > 2
}

/**
 * 将 VNode 上的 props 映射到真实 DOM 元素上。
 */
export function patchProps(
  el: Element,
  props: Record<string, unknown> | null,
): void {
  if (!props) {
    return
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === 'ref' && typeof value === 'function') {
      value(el)
      continue
    }

    if (key === 'class' || key === 'className') {
      el.className = value == null ? '' : String(value)
      continue
    }

    if (key === 'style') {
      applyStyle(el as HTMLElement, value)
      continue
    }

    if (isEventProp(key) && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase()

      el.addEventListener(eventName, value as EventListener)
      continue
    }

    patchDomAttr(el, key, value)
  }
}

/**
 * 处理 style 属性，支持字符串和对象两种写法。
 */
function applyStyle(el: HTMLElement, value: unknown) {
  if (value == null || value === false) {
    el.removeAttribute('style')

    return
  }

  if (typeof value === 'string') {
    el.setAttribute('style', value)

    return
  }

  if (typeof value === 'object') {
    for (const [name, styleValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const resolved = styleValue ?? ''

      if (name in el.style) {
        ;(el.style as WritableStyle)[name] = String(resolved)
      } else {
        el.style.setProperty(name, String(resolved))
      }
    }
  }
}

/**
 * 处理普通 DOM 属性，包括布尔属性的存在性表达。
 */
function patchDomAttr(el: Element, key: string, value: unknown) {
  if (value == null || value === false) {
    el.removeAttribute(key)

    return
  }

  if (value === true) {
    el.setAttribute(key, '')

    return
  }

  el.setAttribute(key, String(value))
}
