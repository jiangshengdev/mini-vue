import type { Router } from '../core/types.ts'
import { useRouter } from '../core/injection.ts'
import type { SetupComponent } from '@/jsx-foundation/types.ts'

/**
 * RouterView 的 props，承载路由实例以获取当前视图。
 */
export interface RouterViewProps {
  /** 提供 currentRoute 的路由器实例。 */
  router?: Router
}

/**
 * 动态渲染当前路由对应组件的占位容器。
 */
export const RouterView: SetupComponent<RouterViewProps> = (props) => {
  const router = props.router ?? useRouter()

  /* 渲染函数：读取 currentRoute 的组件并输出。 */
  return () => {
    const View = router.currentRoute.value.component

    return <View />
  }
}
