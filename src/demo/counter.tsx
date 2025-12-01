import type { ComponentType } from '@/index.ts'
import { reactive } from '@/index.ts'

const state = reactive({ count: 0 })

export const Counter: ComponentType = () => {
  const increment = () => {
    state.count += 1
  }

  return (
    <button type="button" onClick={increment}>
      count is {state.count}
    </button>
  )
}
