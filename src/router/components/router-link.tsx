import { useRouter } from '../core/injection.ts'
import { getQueryAndHash, normalizePath } from '../core/paths.ts'
import type { Router } from '../core/types.ts'
import type { ComponentChildren, SetupComponent } from '@/jsx-foundation/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * `RouterLink` 的 `props` 定义，描述目标路径与所属路由器。
 *
 * @beta
 */
export interface RouterLinkProps extends PropsShape {
  /** 需要导航到的目标路径。 */
  to: string
  /** 路由器实例，负责执行导航。 */
  router?: Router
  /** `a` 标签的 target。 */
  target?: string
  /** 点击链接时的回调，在导航完成后调用。 */
  onClick?: (event?: Event) => void
  /** 插入到链接内部的子节点。 */
  children?: ComponentChildren
}

/**
 * 轻量链接组件：拦截点击并通过路由器执行 SPA 导航。
 *
 * @remarks
 * - 渲染为标准 `<a>` 标签，保持语义化和可访问性。
 * - 拦截点击事件，使用 `router.navigate` 替代浏览器默认跳转。
 * - 支持修饰键（Ctrl/Meta/Shift/Alt）和 `target="_blank"` 时回退到浏览器默认行为。
 *
 * @beta
 */
export const RouterLink: SetupComponent<RouterLinkProps> = (props) => {
  /* 优先使用 props 传入的 router，否则从组件树注入中获取。 */
  const resolvedRouter = props.router ?? useRouter()

  /**
   * 点击事件处理器：阻止默认跳转，转为 history 导航。
   *
   * @remarks
   * - 以下情况不拦截，保持浏览器默认行为：
   *   1. 事件已被其他处理器阻止（`defaultPrevented`）
   *   2. `target="_blank"` 需要新窗口打开
   *   3. 带修饰键点击（Ctrl/Meta/Shift/Alt）通常用于新标签页打开
   *   4. 非左键点击（`button !== 0`）
   */
  const handleClick = (event?: Event): void => {
    if (event) {
      /* 已被阻止或需要新窗口打开时，不拦截。 */
      if (event.defaultPrevented || props.target?.toLowerCase() === '_blank') {
        return
      }

      /* 带修饰键或非左键点击时，不拦截。 */
      if (
        event instanceof MouseEvent &&
        (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        return
      }

      event.preventDefault()
    }

    /* 执行 SPA 导航。 */
    resolvedRouter.navigate(props.to)

    /* 导航完成后调用外部传入的 onClick 回调。 */
    props.onClick?.(event)
  }

  /* 渲染标准 `<a>` 标签，href 使用归一化路径以保持 URL 一致性。 */
  return () => {
    const { to, router: _router, onClick: _onClick, children, ...rest } = props

    const href = `${normalizePath(to)}${getQueryAndHash(to)}`

    return (
      <a {...rest} href={href} onClick={handleClick}>
        {children}
      </a>
    )
  }
}
