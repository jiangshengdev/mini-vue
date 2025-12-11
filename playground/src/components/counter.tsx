import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const Counter: SetupComponent = () => {
  const count = ref(0)

  const increment = (): void => {
    count.value += 1
  }

  return () => {
    return (
      <>
        <button type="button" onClick={increment}>
          count is {count.value}
        </button>
      </>
    )
  }
}
