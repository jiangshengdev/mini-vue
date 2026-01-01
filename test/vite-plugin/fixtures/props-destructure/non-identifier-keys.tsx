import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { 'foo.bar': fooBar, baz } = props

  return () => {
    return (
      <div>
        {fooBar}
        {baz}
      </div>
    )
  }
}
