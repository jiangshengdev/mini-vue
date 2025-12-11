import type { Router } from '../core/types.ts'
import type { SetupComponent } from '@/jsx-foundation/types.ts'

export interface RouterViewProps {
  router: Router
}

export const RouterView: SetupComponent<RouterViewProps> = (props) => {
  return () => {
    const View = props.router.currentRoute.value.component

    return <View />
  }
}
