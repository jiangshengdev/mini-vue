import type { SetupComponent } from '@/index.ts'
import { ref } from 'vue'

export const App: SetupComponent = () => {
  const count = ref(0)
  return () => <div />
}
