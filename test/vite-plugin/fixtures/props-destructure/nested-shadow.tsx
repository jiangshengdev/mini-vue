import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  const render = () => {
    const foo = 1
    return foo
  }
  return () => (
    <div>
      {foo}
      {render()}
    </div>
  )
}
