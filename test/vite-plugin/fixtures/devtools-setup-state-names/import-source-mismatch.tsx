import type { SetupComponent } from '@/index.ts'
import { ref } from './mock-vue.ts'

export const App: SetupComponent = () => {
  const count = ref(0)
  return () => <div>{count.value}</div>
}
