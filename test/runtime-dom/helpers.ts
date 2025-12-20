import { createTestContainer } from '../setup.ts'
import { createApp, render } from '@/index.ts'
import type { SetupComponent } from '@/index.ts'

export function createRenderlessComponent(onSetup?: () => void): SetupComponent {
  return () => {
    onSetup?.()

    return () => {
      return undefined
    }
  }
}

export function createHostWithApp(component: SetupComponent) {
  const container = createTestContainer()
  const app = createApp(component)

  return { app, container }
}

type RenderNode = Parameters<typeof render>[0]

export function renderIntoNewContainer(node: RenderNode) {
  const container = createTestContainer()

  render(node, container)

  return container
}
