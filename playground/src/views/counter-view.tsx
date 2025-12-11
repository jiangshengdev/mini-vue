import { Counter } from '../components/counter.tsx'
import type { SetupComponent } from '@/index.ts'

export const CounterView: SetupComponent = () => {
  return () => {
    return (
      <div class="card">
        <h2>Counter Demo</h2>
        <Counter />
      </div>
    )
  }
}
