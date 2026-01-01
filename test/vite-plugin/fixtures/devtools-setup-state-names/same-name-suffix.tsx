import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const App: SetupComponent = () => {
  const count = ref(0)
  if (count.value === 0) {
    const count = ref(1)
    void count
  }
  return () => <div>{count.value}</div>
}
