import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const App: SetupComponent = () => {
  const drawer = createDrawerStateManager()
  return () => <div>{drawer.isOpen.value ? 'open' : 'closed'}</div>
}

export function createDrawerStateManager(initialOpen = false) {
  const isOpen = state(initialOpen)
  return { isOpen }
}
