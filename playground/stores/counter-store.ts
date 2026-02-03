import { computed, defineStore, ref } from '@/index.ts'

export const useCounterStore = defineStore('playground-counter', () => {
  const count = ref(0)
  const doubled = computed(() => {
    return count.value * 2
  })

  const inc = (): void => {
    count.value += 1
  }

  const dec = (): void => {
    count.value -= 1
  }

  const reset = (): void => {
    count.value = 0
  }

  return { count, doubled, inc, dec, reset }
})
