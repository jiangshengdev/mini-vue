import { ref } from './mock-vue.ts'
import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = () => {
  const count = ref(0)

  return () => {
    return <div>{count.value}</div>
  }
}
