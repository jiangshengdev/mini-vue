import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { 'foo.bar': fooBar, ['baz']: baz } = props
  return () => <div>{fooBar}{baz}</div>
}
