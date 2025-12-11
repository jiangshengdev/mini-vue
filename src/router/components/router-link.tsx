import { normalizePath } from '../core/paths.ts'
import type { Router } from '../core/types.ts'
import type { ComponentChildren, SetupComponent } from '@/jsx-foundation/types.ts'
import type { PropsShape } from '@/shared/index.ts'

export interface RouterLinkProps extends PropsShape {
  to: string
  router: Router
  children?: ComponentChildren
}

export const RouterLink: SetupComponent<RouterLinkProps> = (props) => {
  const handleClick = (event?: Event): void => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault()
    }

    props.router.navigate(props.to)
  }

  return () => {
    const { to, router: _router, children, ...rest } = props

    return (
      <a {...rest} href={normalizePath(to)} onClick={handleClick}>
        {children}
      </a>
    )
  }
}
