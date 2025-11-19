import type { ComponentType } from '@/index.ts'
import { effect, reactive } from '@/index.ts'

export const Counter: ComponentType = () => {
  const state = reactive({ count: 0 })
  let buttonEl: HTMLButtonElement | null = null

  effect(() => {
    const label = `count is ${state.count}`

    if (buttonEl) {
      buttonEl.textContent = label
    }
  })

  const bindRef = (element: Element | null) => {
    buttonEl = (element as HTMLButtonElement | null) ?? null
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
