import type { SetupComponent } from '@/index.ts'
import { toRef as r, watch as w } from '@/index.ts'

export const App: SetupComponent<{ foo: { bar: number } }> = (props) => {
  const { foo } = props

  w(foo, () => {
    void 0
  })
  r(foo, 'bar')

  return () => {
    return <div>{foo.bar}</div>
  }
}
