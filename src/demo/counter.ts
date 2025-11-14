import { reactive, effect } from '@/index.ts'

export function setupCounter(element: HTMLButtonElement) {
  const state = reactive({ count: 0 })

  effect(() => {
    element.textContent = `count is ${state.count}`
  })

  element.addEventListener('click', () => {
    state.count += 1
  })
}
