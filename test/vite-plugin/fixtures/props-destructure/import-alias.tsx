import type { SetupComponent } from '@/index.ts'
import { watch as w, toRef as r } from '@/index.ts'

export const App: SetupComponent<{ foo: { bar: number } }> = (props) => {
  const { foo } = props
  w(foo, () => {})
  r(foo, 'bar')
  return () => <div>{foo.bar}</div>
}
