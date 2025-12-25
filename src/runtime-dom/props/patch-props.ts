/**
 * 将 VirtualNode 上的 props 映射到真实 DOM 元素上。
 *
 * 本模块是 DOM 属性打补丁的统一入口，负责：
 * 1. 收集前后 props 的所有键，确保新增与删除都被覆盖
 * 2. 按处理优先级逐项分派到各专用处理器
 * 3. 剩余普通属性直接映射到 DOM attribute
 *
 * 处理优先级（从高到低）：
 * - `ref`：交由上层消费，这里跳过
 * - `class`/`className`：统一映射到 className 字段
 * - `style`：样式对象/字符串的合并与删除
 * - `value`/`checked`：表单受控属性，通过 DOM property 控制
 * - `onXxx`：事件绑定，复用 invoker 保持监听引用稳定
 * - 其他：普通 DOM attribute
 */
import { patchDomAttr } from './attr.ts'
import { handleClassProp } from './class.ts'
import { handleEventProp } from './event.ts'
import { handleFormStateProp } from './form.ts'
import { ignoreRefProp } from './ref.ts'
import { handleStyleProp } from './style.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * 将 VirtualNode 的 props 差异应用到真实 DOM 元素。
 *
 * @param element - 目标 DOM 元素
 * @param previousProps - 上一次渲染的 props，用于对比删除
 * @param nextProps - 本次渲染的 props，用于新增或更新
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
    patchDomAttr(element, key, previousValue, nextValue)
  }
}
