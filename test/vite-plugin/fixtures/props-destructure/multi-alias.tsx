import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo, bar: baz } = props
  return () => <div>{foo}{baz}</div>
}
