import type { SetupComponent } from '@/index.ts'
import { toRef, watch } from '@/index.ts'

export const App: SetupComponent<{ foo: { bar: number } }> = (props) => {
  const { foo } = props

  watch(foo, () => {})
  toRef(foo, 'bar')

  return () => {
    return <div>{foo.bar}</div>
  }
}
