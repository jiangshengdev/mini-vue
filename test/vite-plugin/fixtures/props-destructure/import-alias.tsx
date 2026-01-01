import type { SetupComponent } from '@/index.ts'
import { watch as w, toRef as r } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  w(foo, () => {})
  r(foo)
  return () => <div>{foo}</div>
}
