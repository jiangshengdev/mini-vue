import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { 'foo.bar': fooBar, 'baz-qux': bazQux } = props

  return () => {
    return (
      <div>
        {fooBar}
        {bazQux}
      </div>
    )
  }
}
