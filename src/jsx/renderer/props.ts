function isEventProp(key: string) {
  return key.startsWith('on') && key.length > 2
}

export function applyProps(el: Element, props: Record<string, unknown> | null) {
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

    applyDomProp(el, key, value)
  }
}

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
      el.style.setProperty(name, String(resolved))
    }
  }
}

function applyDomProp(el: Element, key: string, value: unknown) {
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
