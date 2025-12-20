import { createTestContainer } from '../setup.ts'
import { createApp, render } from '@/index.ts'
import type { SetupComponent } from '@/index.ts'

/** 创建不渲染内容的组件，用于触发 setup/生命周期但不产出 DOM。 */
export function createRenderlessComponent(onSetup?: () => void): SetupComponent {
  return () => {
    onSetup?.()

    return () => {
      return undefined
    }
  }
}

/** 快速生成 app 与全新宿主容器，减少测试样板。 */
export function createHostWithApp(component: SetupComponent) {
  const container = createTestContainer()
  const app = createApp(component)

  return { app, container }
}

type RenderNode = Parameters<typeof render>[0]

/** 在一次性容器中渲染节点，便于局部断言与清理。 */
export function renderIntoNewContainer(node: RenderNode) {
  const container = createTestContainer()

  render(node, container)

  return container
}
