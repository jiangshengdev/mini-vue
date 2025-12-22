/**
 * 将 `virtualNode` 上的 `props` 映射到真实 DOM 元素上。
 */
import { patchDomAttr } from './attr.ts'
import { handleClassProp } from './class.ts'
import { handleEventProp } from './event.ts'
import { handleFormValueProp } from './form.ts'
import { handleRefProp } from './ref.ts'
import { handleStyleProp } from './style.ts'
import type { PropsShape } from '@/shared/index.ts'

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

    if (handleRefProp(key, previousValue, nextValue)) continue
    if (handleClassProp(element, key, nextValue)) continue
    if (handleStyleProp(element, key, previousValue, nextValue)) continue
    if (handleFormValueProp(element, key, previousValue, nextValue)) continue
    if (handleEventProp(element, key, previousValue, nextValue)) continue

    patchDomAttr(element, key, nextValue)
  }
}
