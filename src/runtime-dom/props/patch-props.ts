/**
 * 将 `virtualNode` 上的 `props` 映射到真实 DOM 元素上。
 */
import { patchDomAttr } from './attr.ts'
import { handleClassProp } from './class.ts'
import { handleEventProp } from './event.ts'
import { handleFormStateProp } from './form.ts'
import { ignoreRefProp } from './ref.ts'
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

  /* 按处理优先级逐项分派，避免不同类型的 `prop` 互相覆盖。 */
  for (const key of keys) {
    const previousValue = previous[key]
    const nextValue = next[key]

    /* `ref` 交由上层消费，这里只负责跳过。 */
    if (ignoreRefProp(key, previousValue, nextValue)) {
      continue
    }

    /* `class` 相关键统一映射到 `className` 字段。 */
    if (handleClassProp(element, key, previousValue, nextValue)) {
      continue
    }

    /* 样式对象/字符串需要合并与删除的双向处理。 */
    if (handleStyleProp(element, key, previousValue, nextValue)) {
      continue
    }

    /* 表单类 `prop` 通过 DOM property 控制，确保受控一致性。 */
    if (handleFormStateProp(element, key, previousValue, nextValue)) {
      continue
    }

    /* 事件绑定需复用 `invoker`，保持监听引用稳定。 */
    if (handleEventProp(element, key, previousValue, nextValue)) {
      continue
    }

    /* 其余普通属性直接映射到 DOM attribute。 */
    patchDomAttr(element, key, nextValue)
  }
}
