type WritableStyle = CSSStyleDeclaration & Record<string, string | null>

function isEventProp(key: string) {
  return key.startsWith('on') && key.length > 2
}

/**
 * 将 VNode 上的 props 映射到真实 DOM 元素上。
 */
export function applyProps(el: Element, props: Record<string, unknown> | null) {
  if (!props) {
    return
  }

  for (const [key, value] of Object.entries(props)) {
    /* ref 回调在挂载时直接收到元素引用 */
    if (key === 'ref' && typeof value === 'function') {
      value(el)
      continue
    }

    /* 支持 class 与 className 两种写法统一设置 className */
    if (key === 'class' || key === 'className') {
      el.className = value == null ? '' : String(value)
      continue
    }

    /* style 交由专门的 applyStyle 处理不同格式 */
    if (key === 'style') {
      applyStyle(el as HTMLElement, value)
      continue
    }

    /* onXxx 形式的 props 解析为原生事件监听 */
    if (isEventProp(key) && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase()

      el.addEventListener(eventName, value as EventListener)
      continue
    }

    /* 其余属性统一按普通 DOM 属性处理 */
    applyDomProp(el, key, value)
  }
}

/**
 * 处理 style 属性，支持字符串和对象两种写法。
 */
function applyStyle(el: HTMLElement, value: unknown) {
  /* null / undefined / false 统一视为移除行内样式 */
  if (value == null || value === false) {
    el.removeAttribute('style')

    return
  }

  /* 字符串形式直接作为完整 style 文本设置 */
  if (typeof value === 'string') {
    el.setAttribute('style', value)

    return
  }

  /* 对象形式按键值逐项设置行内样式属性 */
  if (typeof value === 'object') {
    for (const [name, styleValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      /* 将 null / undefined 等空值转为空字符串 */
      const resolved = styleValue ?? ''

      if (name in el.style) {
        /* 命中内联样式字段，允许 camelCase 名称 */
        ;(el.style as WritableStyle)[name] = String(resolved)
      } else {
        /* 兜底写入，例如 CSS 变量或未识别字段 */
        el.style.setProperty(name, String(resolved))
      }
    }
  }
}

/**
 * 处理普通 DOM 属性，包括布尔属性的存在性表达。
 */
function applyDomProp(el: Element, key: string, value: unknown) {
  /* null / undefined / false 代表移除该属性 */
  if (value == null || value === false) {
    el.removeAttribute(key)

    return
  }

  /* true 代表布尔属性存在即可，值为空字符串 */
  if (value === true) {
    el.setAttribute(key, '')

    return
  }

  /* 其余情况统一转为字符串写入属性 */
  el.setAttribute(key, String(value))
}
