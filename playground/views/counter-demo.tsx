import { Counter } from '../components/counter.tsx'
import type { SetupComponent } from '@/index.ts'

export const CounterDemo: SetupComponent = () => {
  return () => {
    return (
      <div class="card">
        <h2>计数器示例</h2>
        <Counter />
      </div>
    )
  }
}
