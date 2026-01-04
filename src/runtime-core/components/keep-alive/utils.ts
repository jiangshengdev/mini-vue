/**
 * `KeepAlive` 子系统工具集：
 * - `children` 归一化（过滤 `Comment` 占位）
 * - 组件名解析与 `include`/`exclude` 规则匹配
 * - 缓存 key 生成
 */
import type { KeepAliveCacheKey } from './context-types.ts'
import type { RenderOutput, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Comment, Fragment, isVirtualNode } from '@/jsx-foundation/index.ts'

/**
 * `KeepAlive` 的组件名匹配模式：支持字符串、正则或其数组。
 *
 * @remarks
 * - 字符串模式支持逗号分隔多个组件名（如 `A,B,C`）。
 */
export type KeepAlivePattern = string | RegExp | Array<string | RegExp>

/**
 * 将外部 children 标准化为可缓存的虚拟节点列表。
 *
 * @param children - 组件渲染输出
 * @returns 过滤后的子节点及多子节点标记
 */
export function resolveChildren(children: RenderOutput | undefined): {
  children: VirtualNode[]
  hasMultipleChildren: boolean
} {
  /* 数组 children：过滤掉 `Comment` 占位，并只保留可参与缓存的 `VirtualNode`。 */
  if (Array.isArray(children)) {
    const vnodes = children.filter((child): child is VirtualNode => {
      return isVirtualNode(child) && child.type !== Comment
    })

    return {
      children: vnodes,
      hasMultipleChildren: vnodes.length > 1,
    }
  }

  /* 单个节点：仅接受非 `Comment` 的 `VirtualNode`。 */
  if (isVirtualNode(children) && children.type !== Comment) {
    return {
      children: [children],
      hasMultipleChildren: false,
    }
  }

  /* 其他类型（文本、布尔或空）不参与缓存，返回空列表。 */
  return {
    children: [],
    hasMultipleChildren: false,
  }
}

/**
 * 判断虚拟节点是否为可缓存的组件节点。
 *
 * @param child - 需要校验的虚拟节点
 * @returns 是否为组件类型且非片段
 */
export function isComponentChild(child: VirtualNode): child is VirtualNode<SetupComponent> {
  /* 排除 `Fragment`：它只做 `children` 透传，不对应可缓存的组件实例。 */
  return typeof child.type === 'function' && child.type !== Fragment
}

/**
 * 解析组件名，用于 include/exclude 规则匹配。
 *
 * @param child - 组件虚拟节点
 * @returns 组件名或 `undefined`
 */
export function getComponentName(child: VirtualNode<SetupComponent>): string | undefined {
  /* 防御式判断：仅函数类型才可能携带组件名。 */
  if (typeof child.type !== 'function') {
    return undefined
  }

  /* 使用组件函数名参与规则匹配，匿名函数会回退为 `undefined`。 */
  return child.type.name || undefined
}

/**
 * 根据 include/exclude 规则判断组件是否应被缓存。
 *
 * @param name - 组件名
 * @param include - 允许列表
 * @param exclude - 排除列表
 * @returns 是否允许缓存
 */
export function shouldIncludeComponent(
  name: string | undefined,
  include: KeepAlivePattern | undefined,
  exclude: KeepAlivePattern | undefined,
): boolean {
  /* `include` 作为白名单：给定时未命中即不缓存。 */
  if (include && !matchesPattern(name, include)) {
    return false
  }

  /* `exclude` 作为黑名单：命中时强制不缓存，覆盖 `include`。 */
  if (exclude && matchesPattern(name, exclude)) {
    return false
  }

  return true
}

/**
 * 生成用于缓存的 key，优先使用显式 `key`。
 *
 * @param child - 组件虚拟节点
 * @returns 缓存 key
 */
export function resolveCacheKey(child: VirtualNode<SetupComponent>): KeepAliveCacheKey {
  /* 优先使用显式 `key`，否则回退到组件类型本身以获得稳定映射。 */
  if (child.key !== undefined) {
    return child.key
  }

  return child.type
}

/**
 * 校验组件名是否命中模式。
 *
 * @param name - 组件名
 * @param pattern - 字符串、正则或数组模式
 * @returns 是否匹配
 */
function matchesPattern(name: string | undefined, pattern: KeepAlivePattern): boolean {
  /* 未命名组件无法参与规则匹配，视为未命中。 */
  if (!name) {
    return false
  }

  /* 数组模式：任意子项命中即视为命中。 */
  if (Array.isArray(pattern)) {
    return pattern.some((item) => {
      return matchesPattern(name, item)
    })
  }

  /* 字符串模式：支持以逗号分隔的组件名列表。 */
  if (typeof pattern === 'string') {
    return pattern
      .split(',')
      .map((value) => {
        return value.trim()
      })
      .filter(Boolean)
      .includes(name)
  }

  /* 正则模式：直接执行测试。 */
  return pattern.test(name)
}
