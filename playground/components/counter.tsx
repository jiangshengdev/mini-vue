import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const Counter: SetupComponent = () => {
  const count = state(0)

  const increment = (): void => {
    count.set(count.get() + 1)
  }

  return () => {
    return (
      <>
        <button type="button" onClick={increment}>
          count is {count.get()}
        </button>
      </>
    )
  }
}
