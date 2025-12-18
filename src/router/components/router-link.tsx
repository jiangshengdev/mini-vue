import { useRouter } from '../core/injection.ts'
import { normalizePath } from '../core/paths.ts'
import type { Router } from '../core/types.ts'
import type { ComponentChildren, SetupComponent } from '@/jsx-foundation/index.ts'
import type { PropsShape } from '@/shared/index.ts'

/**
 * `RouterLink` 的 `props` 定义，描述目标路径与所属路由器。
 */
export interface RouterLinkProps extends PropsShape {
  /** 需要导航到的目标路径。 */
  to: string
  /** 路由器实例，负责执行导航。 */
  router?: Router
  /** `a` 标签的 target。 */
  target?: string
  /** 插入到链接内部的子节点。 */
  children?: ComponentChildren
}

/**
 * 轻量链接组件：拦截点击并通过路由器执行导航。
 */
export const RouterLink: SetupComponent<RouterLinkProps> = (props) => {
  const resolvedRouter = props.router ?? useRouter()

  /* 点击时阻止默认跳转，转为 history 导航。 */
  const handleClick = (event?: Event): void => {
    if (event) {
      if (event.defaultPrevented || props.target?.toLowerCase() === '_blank') {
        return
      }

      if (
        event instanceof MouseEvent &&
        (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      ) {
        return
      }

      event.preventDefault()
    }

    resolvedRouter.navigate(props.to)
  }

  /* 渲染标准 `a` 标签并挂载导航行为。 */
  return () => {
    const { to, router: _router, children, ...rest } = props

    return (
      <a {...rest} href={normalizePath(to)} onClick={handleClick}>
        {children}
      </a>
    )
  }
}
