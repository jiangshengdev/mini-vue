import { resolveComponentProps } from '../component/props.ts'
import { assignElementRef, resolveElementRefBinding } from '../mount/element.ts'
import { mountChild } from '../mount/index.ts'
import type { NormalizedVirtualNode } from '../normalize.ts'
import type { RendererOptions } from '../renderer.ts'
import type { PatchEnvironment } from './children-environment.ts'
import { patchChildren } from './children.ts'
import { normalizeMountContext } from './context.ts'
import { asRuntimeNormalizedVirtualNode } from './runtime-vnode.ts'
import { isComponentVirtualNode, isTextVirtualNode } from './types.ts'
import { isSameVirtualNode, moveNodes, syncRuntimeMetadata, unmount } from './utils.ts'
import type { SetupComponent } from '@/jsx-foundation/index.ts'
import { Fragment } from '@/jsx-foundation/index.ts'

/**
 * 对单个子节点进行 `patch`：
 * - 处理新增/删除/替换/同节点更新四种情况。
 * - 需要时会使用 `anchor` 将新挂载的节点移动到正确位置。
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
): void {
  /* 同一引用视为无变更：避免重复 `patch` 引发多余的 `props`/`children` 计算与宿主写入。 */
  if (previous === next) {
    return
  }

  /* 仅存在新节点：走 `mount` 路径，并在需要时用 `anchor` 修正插入位置。 */
  if (!previous) {
    if (!next) {
      return
    }

    /* `patch` 阶段复用 `mount` 能力：由 `mountChild` 负责创建宿主节点、建立 `handle` 与依赖副作用。 */
    const mounted = mountChild(
      options,
      next,
      environment.container,
      normalizeMountContext(environment.context),
    )

    if (mounted && environment.anchor) {
      /* `mountChild` 通常追加插入，若存在锚点则将新节点整体移动到锚点前。 */
      moveNodes(options, mounted.nodes, environment.container, environment.anchor)
    }

    return
  }

  /* 仅存在旧节点：直接卸载，释放宿主节点与组件/响应式副作用。 */
  if (!next) {
    unmount(options, previous)

    return
  }

  /* 同节点（`type`/`key` 视角）可复用：走 `patch`；否则视为替换，先卸载再重新挂载。 */
  if (isSameVirtualNode(previous, next)) {
    patchExisting(options, previous, next, environment)

    return
  }

  /* 替换路径：旧节点 `teardown` 后再 `mount` 新节点，避免残留事件/副作用引用。 */
  unmount(options, previous)
  const mounted = mountChild(
    options,
    next,
    environment.container,
    normalizeMountContext(environment.context),
  )

  if (mounted && environment.anchor) {
    moveNodes(options, mounted.nodes, environment.container, environment.anchor)
  }
}

/**
 * `patch` 同类型节点：按 `Text` / `Fragment` / 组件 / 元素分派到不同更新策略。
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
): void {
  /* `Text` 的宿主节点只有一个：复用旧 `el`，并仅更新文本内容即可。 */
  if (isTextVirtualNode(previous) && isTextVirtualNode(next)) {
    const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
      previous,
    )
    const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)

    /* 先同步 runtime 元数据，保证后续读取 `next.el`/`handle` 时语义一致。 */
    syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: undefined })

    if (runtimePrevious.el) {
      /* 仅当旧 `el` 存在时才能 `setText`；否则说明旧节点未正确 `mount`（防御性不报错）。 */
      options.setText(runtimePrevious.el, next.text ?? '')
    }

    return
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

    return
  }

  /* 组件与元素的更新能力不同：组件需要驱动 `effect`/子树，元素需要 `patchProps`/`children`/`ref`。 */
  if (isComponentVirtualNode(previous) && isComponentVirtualNode(next)) {
    patchComponent(options, previous, next, environment)

    return
  }

  patchElement(options, previous, next, environment)
}

/**
 * `patch` 同标签元素：复用旧 `el`，更新 `props` 与 `children`，并维护 `ref` 绑定。
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
): void {
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

  /* `ref` 支持多形态写法：这里先解析出统一的“可赋值绑定”。 */
  const previousRef = resolveElementRefBinding<HostElement>(previous.props?.ref)
  const nextRef = resolveElementRefBinding<HostElement>(next.props?.ref)

  /* 先解绑旧 ref，避免同一轮 patch 中 ref 指向过期元素。 */
  if (previousRef) {
    assignElementRef(previousRef, undefined)
  }

  /* `props` 与 `children` 的更新顺序保持与 `mount` 阶段一致：先属性再子树。 */
  /* `patchProps` 需要同时知道旧/新 `props`，用于移除旧属性与更新事件等。 */
  options.patchProps(element, previous.props, next.props)
  /* `children` `patch` 的容器切换为当前元素本身；兄弟顺序由外层 `anchor` 决定。 */
  patchChildren(options, previous.children, next.children, {
    container: element,
    patchChild,
    anchor: environment.anchor,
    context: environment.context,
  })

  /* 最后绑定新 `ref`，确保其拿到的是完成更新后的稳定元素引用。 */
  if (nextRef) {
    assignElementRef(nextRef, element)
  }
}

/**
 * 同类型组件 `vnode` 的更新逻辑：复用实例，触发 `effect` 或直接 `patch` 子树。
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
): void {
  const runtimePrevious = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(
    previous,
  )
  const runtimeNext = asRuntimeNormalizedVirtualNode<HostNode, HostElement, HostFragment>(next)
  const instance = runtimePrevious.component

  /*
   * 组件更新依赖 `runtime.component`：
   * - 正常情况下 `mount` 会写入实例。
   * - 若缺失则无法复用，只能退化为重新 `mount` 新 `vnode`。
   */
  if (!instance) {
    const mounted = mountChild(
      options,
      next,
      environment.container,
      normalizeMountContext(environment.context),
    )

    if (mounted && environment.anchor) {
      moveNodes(options, mounted.nodes, environment.container, environment.anchor)
    }

    return
  }

  /* 复用旧组件实例：同步宿主引用，并将 `next` 绑定到同一个 `component` 上。 */
  syncRuntimeMetadata(runtimePrevious, runtimeNext, { component: instance })
  /* 组件 `props` 需要走规范化流程（包含默认值/`attrs` 等策略），避免直接透传 raw `props`。 */
  instance.props = resolveComponentProps(next)
  /* `effect.run` 依赖实例化时的 `this` 语义，这里显式 `bind` 保持一致。 */
  const runner = instance.effect?.run.bind(instance.effect)

  /*
   * 若存在调度器则交由 `scheduler` 合并/去重更新；否则立即运行并对比子树。
   * 这里通过 `patchChild` 复用外层插入/锚点策略，确保组件更新不破坏兄弟节点顺序。
   */
  if (instance.effect?.scheduler && runner) {
    /* 有调度器时只提交“运行任务”，由 `scheduler` 决定合并与执行时机。 */
    instance.effect.scheduler(runner)
  } else if (runner) {
    /* 无调度器时立刻执行：先缓存旧子树，再运行 `effect` 得到新子树，最后对比 `patch`。 */
    const previousSubTree = instance.subTree

    runner()
    patchChild(options, previousSubTree, instance.subTree, environment)
  }
}
