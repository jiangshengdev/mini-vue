import { ref } from '@/index.ts'

export const foo = () => {
  const count = ref(0)
  return count
}
