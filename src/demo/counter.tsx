import type { ComponentType } from '@/index.ts'
import { effect, reactive } from '@/index.ts'

export const Counter: ComponentType = () => {
  const state = reactive({ count: 0 })
  let buttonElement: HTMLButtonElement | undefined

  effect(() => {
    const label = `count is ${state.count}`

    if (buttonElement) {
      buttonElement.textContent = label
    }
  })

  const bindRef = (element?: Element) => {
    buttonElement = (element as HTMLButtonElement | undefined) ?? undefined
  }

  const increment = () => {
    state.count += 1
  }

  return (
    <button type="button" ref={bindRef} onClick={increment}>
      count is {state.count}
    </button>
  )
}
