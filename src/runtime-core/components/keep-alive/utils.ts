/**
 * KeepAlive 子系统工具集：
 * - children 归一化（过滤 Comment）
 * - 组件名解析与 include/exclude 规则匹配
 * - 缓存 key 生成
 */
import type { RenderOutput, SetupComponent, VirtualNode } from '@/jsx-foundation/index.ts'
import { Comment, Fragment, isVirtualNode } from '@/jsx-foundation/index.ts'
import type { KeepAliveCacheKey } from '../keep-alive-context.ts'

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
  if (Array.isArray(children)) {
    const vnodes = children.filter((child): child is VirtualNode => {
      return isVirtualNode(child) && child.type !== Comment
    })

    return {
      children: vnodes,
      hasMultipleChildren: vnodes.length > 1,
    }
  }

  if (isVirtualNode(children) && children.type !== Comment) {
    return {
      children: [children],
      hasMultipleChildren: false,
    }
  }

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
  return typeof child.type === 'function' && child.type !== Fragment
}

/**
 * 解析组件名，用于 include/exclude 规则匹配。
 *
 * @param child - 组件虚拟节点
 * @returns 组件名或 `undefined`
 */
export function getComponentName(child: VirtualNode<SetupComponent>): string | undefined {
  if (typeof child.type !== 'function') {
    return undefined
  }

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
  if (include && !matchesPattern(name, include)) {
    return false
  }

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
  if (!name) {
    return false
  }

  if (Array.isArray(pattern)) {
    return pattern.some((item) => {
      return matchesPattern(name, item)
    })
  }

  if (typeof pattern === 'string') {
    return pattern
      .split(',')
      .map((value) => {
        return value.trim()
      })
      .filter(Boolean)
      .includes(name)
  }

  return pattern.test(name)
}

