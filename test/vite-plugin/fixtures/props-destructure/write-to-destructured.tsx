import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent<{ foo: number }> = (props) => {
  let { foo } = props
  foo = 1
  return () => <div>{foo}</div>
}
