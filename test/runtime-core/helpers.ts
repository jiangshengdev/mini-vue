import type { SetupComponent } from '@/index.ts'

/** 返回不渲染任何内容的组件，便于聚焦宿主行为。 */
export function createRenderlessComponent(onSetup?: () => void): SetupComponent {
  return () => {
    onSetup?.()

    return () => {
      return undefined
    }
  }
}
