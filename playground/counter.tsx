import type { SetupFunctionComponent } from '@/index.ts'
import { reactive } from '@/index.ts'

export const Counter: SetupFunctionComponent = () => {
  const state = reactive({ count: 0 })

  const increment = () => {
    state.count += 1
  }

  return () => {
    return (
      <button type="button" onClick={increment}>
        count is {state.count}
      </button>
    )
  }
}
