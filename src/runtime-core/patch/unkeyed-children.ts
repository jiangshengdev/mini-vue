import type { NormalizedChildren } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchChildrenEnvironment } from './children-environment.ts'
import { createChildEnvironment } from './children-environment.ts'
import { createPatchDriver } from './driver.ts'
import { findNextAnchor } from './utils.ts'

/**
 * `Unkeyed children diff`：
 * - 先按索引 `patch` 公共长度。
 * - 新列表更长则追加 `mount`，并按「后继节点」计算插入锚点。
 * - 旧列表更长则卸载多余节点。
 *
 * @remarks
 * - `unkeyed diff` 只按索引对齐，不支持「同节点换位置」的语义。
 * - 适用于简单列表或列表项没有稳定标识的场景。
 */
export function patchUnkeyedChildren<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previousChildren: NormalizedChildren,
  nextChildren: NormalizedChildren,
  environment: PatchChildrenEnvironment<HostNode, HostElement, HostFragment>,
): void {
  const commonLength = Math.min(previousChildren.length, nextChildren.length)
  const driver = createPatchDriver(options, environment)

  /* 公共部分逐个 `patch`：`unkeyed` 场景下「同索引」即认为是同位置节点。 */
  for (let index = 0; index < commonLength; index += 1) {
    const childEnvironment = createChildEnvironment(environment)

    environment.patchChild(options, previousChildren[index], nextChildren[index], childEnvironment)
  }

  if (nextChildren.length > previousChildren.length) {
    /* 新增节点：逐个 `mount`，并使用「下一个已存在节点」作为插入锚点。 */
    for (let index = commonLength; index < nextChildren.length; index += 1) {
      const next = nextChildren[index]
      /*
       * 追加 mount 时需要一个「后继锚点」：
       * - 若后面还有已 mount 的节点，则插到它前面。
       * - 否则回退到父级 anchor（可能为空，交由宿主实现决定默认插入位置）。
       */
      const nextAnchor = findNextAnchor(nextChildren, index + 1, environment.anchor)
      const childEnvironment = createChildEnvironment(environment)

      driver.mountNew(next, {
        anchor: nextAnchor,
        context: childEnvironment.context,
      })
    }
  } else if (previousChildren.length > nextChildren.length) {
    /* 移除节点：卸载旧列表超出部分。 */
    for (let index = commonLength; index < previousChildren.length; index += 1) {
      driver.unmountOnly(previousChildren[index])
    }
  }
}
