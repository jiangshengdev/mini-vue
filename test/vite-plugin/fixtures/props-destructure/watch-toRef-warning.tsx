import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  watch(foo, () => {})
  toRef(foo)
  return () => <div>{foo}</div>
}
