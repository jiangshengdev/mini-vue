import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const App: SetupComponent = () => {
  const count = ref(0)
  if (true) {
    const count = ref(1)
  }
  return () => <div />
}
