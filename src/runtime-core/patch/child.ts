import { resolveComponentProps } from '../component/props.ts'
import { assignElementRef, resolveElementRefBinding } from '../mount/element.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchEnvironment } from './children-environment.ts'
import { patchChildren } from './children.ts'
import { mountChildInEnvironment } from './insertion.ts'
import { asRuntimeNormalizedVirtualNode } from './runtime-virtual-node.ts'
import type { PatchResult } from './types.ts'
import { isCommentVirtualNode, isComponentVirtualNode, isTextVirtualNode } from './types.ts'
import { getNextHostNode, isSameVirtualNode, syncRuntimeMetadata, unmount } from './utils.ts'
import type { ElementProps, SetupComponent } from '@/jsx-foundation/index.ts'
import { Fragment } from '@/jsx-foundation/index.ts'

/**
 * 对单个子节点进行 `patch`：
 * - 处理新增/删除/替换/同节点更新四种情况。
 * - 需要时会使用 `anchor` 将新挂载的节点移动到正确位置。
 *
 * @remarks
 * 四种情况的处理策略：
 * 1. 同一引用：无变更，跳过。
 * 2. 仅存在新节点：走 `mount` 路径。
 * 3. 仅存在旧节点：直接卸载。
 * 4. 同节点（`type`/`key` 相同）：走 `patch` 复用；否则卸载重建。
 */
export function patchChild<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode | undefined,
  next: NormalizedVirtualNode | undefined,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
): PatchResult<HostNode> {
  /* 同一引用视为无变更：避免重复 `patch` 引发多余的 `props`/`children` 计算与宿主写入。 */
  if (previous === next) {
    return { ok: true }
  }

  /* 仅存在新节点：走 `mount` 路径，并在需要时用 `anchor` 修正插入位置。 */
  if (!previous) {
    if (!next) {
      return { ok: true }
    }

    /* `patch` 阶段复用 `mount` 能力：由 `mountChildInEnvironment` 负责创建宿主节点并一次性插入到锚点前。 */
    const mounted = mountChildInEnvironment(options, next, {
      container: environment.container,
      anchor: environment.anchor,
      context: environment.context,
    })

    return {
      ok: mounted?.ok,
      usedAnchor: environment.anchor,
    }
  }

  /* 仅存在旧节点：直接卸载，释放宿主节点与组件/响应式副作用。 */
  if (!next) {
    unmount(options, previous)

    return { ok: true }
  }

  /* 同节点（`type`/`key` 视角）可复用：走 `patch`；否则视为替换，先卸载再重新挂载。 */
  if (isSameVirtualNode(previous, next)) {
    return patchExisting(options, previous, next, environment)
  }

  /*
   * 替换路径需要一个稳定插入锚点：
   * - 对齐 Vue3：以 `getNextHostNode(previous)` 作为新节点的插入位置。
   * - 若拿不到（极端防御场景）再回退到父级传入的 `environment.anchor`。
   */
  const replacementAnchor = getNextHostNode(options, previous) ?? environment.anchor

  /* 替换路径：旧节点 `teardown` 后再 `mount` 新节点，避免残留事件/副作用引用。 */
  unmount(options, previous)

  const mounted = mountChildInEnvironment(options, next, {
    container: environment.container,
    anchor: replacementAnchor,
    context: environment.context,
  })

  return {
    ok: mounted?.ok,
    usedAnchor: replacementAnchor,
  }
}

/**
 * `patch` 同类型节点：按 `Text` / `Fragment` / 组件 / 元素分派到不同更新策略。
 *
 * @remarks
 * - `Text`：复用旧 `el`，仅更新文本内容。
 * - `Fragment`：通过 `patchChildren` 更新子节点列表。
 * - 组件：复用实例，触发 `effect` 或直接 `patch` 子树。
 * - 元素：复用旧 `el`，更新 `props` 与 `children`。
 */
function patchExisting<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode,
  next: NormalizedVirtualNode,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
): PatchResult<HostNode> {
  /* `Text` 的宿主节点只有一个：复用旧 `el`，并仅更新文本内容即可。 */
  if (isTextVirtualNode(previous) && isTextVirtualNode(next)) {
    const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
      previous,
    )
    const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)

    /* 先同步 runtime 元数据，保证后续读取 `next.el`/`handle` 时语义一致。 */
    syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: undefined })

    /* 文本未变更时避免重复写入宿主节点。 */
    if (previous.text === next.text) {
      return { ok: true }
    }

    if (runtimePrevious.el) {
      /* 仅当旧 `el` 存在时才能 `setText`；否则说明旧节点未正确 `mount`（防御性不报错）。 */
      options.setText(runtimePrevious.el, next.text ?? '')
    }

    return { ok: true }
  }

  /* `Comment` 的宿主节点只有一个：复用旧 `el`，并按需更新注释内容即可。 */
  if (isCommentVirtualNode(previous) && isCommentVirtualNode(next)) {
    const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
      previous,
    )
    const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)

    /* 注释节点不对应组件实例：同步宿主引用并显式清空 `component`/`anchor`。 */
    syncRuntimeMetadata(runtimePrevious, runtimeNext, { anchor: undefined, component: undefined })

    /* 注释内容未变更时避免重复写入。 */
    if (previous.text === next.text) {
      return { ok: true }
    }

    if (runtimePrevious.el) {
      /* 复用 `setText` 更新注释节点内容（DOM Comment 同样支持 nodeValue）。 */
      options.setText(runtimePrevious.el, next.text ?? '')
    }

    return { ok: true }
  }

  /* `Fragment` 自身不对应单一宿主 `el`：通过 `handle.nodes` 表示一段节点区间。 */
  if (next.type === Fragment) {
    const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
      previous,
    )
    const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)

    /* `Fragment` 不携带组件实例：同步宿主引用，但显式清空 `component`，避免误复用。 */
    syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: undefined })

    /*
     * `children` 的 patch 需要一个稳定锚点：
     * - 优先使用旧 `Fragment` 自己记录的 `anchor`（表示片段结束位置）。
     * - 否则回退到父级传入的 `anchor`。
     * - 显式注入 `patchChild`，避免 `child.ts`/`children.ts` 互相 `import` 造成循环，并便于替换/测试。
     */
    patchChildren(options, previous.children, next.children, {
      container: environment.container,
      patchChild,
      anchor: runtimePrevious.anchor ?? environment.anchor,
      context: environment.context,
    })

    return { ok: true }
  }

  /* 组件与元素的更新能力不同：组件需要驱动 `effect`/子树，元素需要 `patchProps`/`children`/`ref`。 */
  if (isComponentVirtualNode(previous) && isComponentVirtualNode(next)) {
    return patchComponent(options, previous, next, environment)
  }

  return patchElement(options, previous, next, environment)
}

/**
 * `patch` 同标签元素：复用旧 `el`，更新 `props` 与 `children`，并维护 `ref` 绑定。
 *
 * @remarks
 * 更新顺序：
 * 1. 同步 runtime 元数据（`el`/`handle`）。
 * 2. 解绑旧 `ref`。
 * 3. 更新 `props`。
 * 4. `patch` `children`。
 * 5. 绑定新 `ref`。
 */
function patchElement<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode,
  next: NormalizedVirtualNode,
  environment: Pick<PatchEnvironment<HostNode, HostElement, HostFragment>, 'anchor' | 'context'>,
): PatchResult<HostNode> {
  const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
    previous,
  )
  const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)
  /* 元素节点必须已经拥有 `el`（由 `mount` 写入）；`patch` 阶段只做复用与更新。 */
  const element = runtimePrevious.el as HostElement

  /* 元素节点不再需要 `anchor`/`component` 元数据，显式清空以避免残留。 */
  syncRuntimeMetadata(runtimePrevious, runtimeNext, {
    anchor: undefined,
    component: undefined,
  })

  /* `ref` 支持多形态写法：这里先解析出统一的「可赋值绑定」。 */
  const previousRef = resolveElementRefBinding<HostElement>(previous.props?.ref)
  const nextRef = resolveElementRefBinding<HostElement>(next.props?.ref)

  /* 先解绑旧 ref，避免同一轮 patch 中 ref 指向过期元素。 */
  if (previousRef) {
    assignElementRef(previousRef, undefined)
  }

  /* `props` 与 `children` 的更新顺序保持与 `mount` 阶段一致：先属性再子树。 */
  /* `patchProps` 需要同时知道旧/新 `props`，用于移除旧属性与更新事件等。 */
  options.patchProps(element, previous.props, next.props)
  /* `children` `patch` 的容器切换为当前元素本身，避免将父级锚点误传到内部子树。 */
  patchChildren(options, previous.children, next.children, {
    container: element,
    patchChild,
    context: environment.context,
  })

  /* 最后绑定新 `ref`，确保其拿到的是完成更新后的稳定元素引用。 */
  if (nextRef) {
    assignElementRef(nextRef, element)
  }

  return { ok: true }
}

/**
 * 同类型组件 `virtualNode` 的更新逻辑：复用实例，触发 `effect` 或直接 `patch` 子树。
 *
 * @remarks
 * - 组件更新依赖 `runtime.component`：正常情况下 `mount` 会写入实例。
 * - 若缺失则无法复用，只能退化为重新 `mount` 新 `virtualNode`。
 * - 有调度器时只提交「运行任务」，由调度器决定合并与执行时机。
 */
function patchComponent<
  HostNode,
  HostElement extends HostNode & WeakKey,
  HostFragment extends HostNode,
>(
  options: RendererOptions<HostNode, HostElement, HostFragment>,
  previous: NormalizedVirtualNode<SetupComponent>,
  next: NormalizedVirtualNode<SetupComponent>,
  environment: PatchEnvironment<HostNode, HostElement, HostFragment>,
): PatchResult<HostNode> {
  const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
    previous,
  )
  const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)
  const instance = runtimePrevious.component

  /*
   * 组件更新依赖 `runtime.component`：
   * - 正常情况下 `mount` 会写入实例。
   * - 若缺失则无法复用，只能退化为重新 `mount` 新 `virtualNode`。
   */
  if (!instance) {
    const mounted = mountChildInEnvironment(options, next, {
      container: environment.container,
      anchor: environment.anchor,
      context: environment.context,
    })

    return {
      ok: mounted?.ok,
      usedAnchor: environment.anchor,
    }
  }

  /* 复用旧组件实例：同步宿主引用，并将 `next` 绑定到同一个 `component` 上。 */
  syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: instance })
  instance.virtualNode = runtimeNext
  instance.vnodeHandle = runtimeNext.handle
  /* 组件 `props` 需要走规范化流程（包含默认值/`attrs` 等策略），避免直接透传 raw `props`。 */
  const nextProps = resolveComponentProps(next)

  syncComponentProps(instance.propsSource, nextProps)
  /* `effect.run` 依赖实例化时的 `this` 语义，这里显式 `bind` 保持一致。 */
  const runner = instance.effect?.run.bind(instance.effect)

  /*
   * 若存在调度器则交由 `scheduler` 合并/去重更新；否则立即运行并对比子树。
   * 这里通过 `patchChild` 复用外层插入/锚点策略，确保组件更新不破坏兄弟节点顺序。
   */
  if (instance.effect?.scheduler && runner) {
    /* 有调度器时只提交「运行任务」，由 `scheduler` 决定合并与执行时机。 */
    instance.effect.scheduler(runner)
  } else if (runner) {
    /* 无调度器时立刻执行：先缓存旧子树，再运行 `effect` 得到新子树，最后对比 `patch`。 */
    const previousSubTree = instance.subTree

    runner()

    return patchChild(options, previousSubTree, instance.subTree, environment)
  }

  return { ok: true }
}

/**
 * 组件 `props` 变更时保持引用不变，便于渲染闭包捕获的 `props` 能读取最新值。
 *
 * @remarks
 * - 先删除旧 `props` 中不存在于新 `props` 的属性。
 * - 再用 `Object.assign` 合并新属性，保持响应式追踪。
 */
function syncComponentProps(
  target: ElementProps<SetupComponent>,
  nextProps: ElementProps<SetupComponent>,
): void {
  /* 先移除旧 `props` 中已不存在的键，保证渲染读取不到过期字段。 */
  for (const key of Object.keys(target)) {
    if (!(key in nextProps)) {
      Reflect.deleteProperty(target, key)
    }
  }

  /* 再合并新 `props`，保持引用稳定以兼容渲染闭包/响应式追踪。 */
  Object.assign(target, nextProps)
}
