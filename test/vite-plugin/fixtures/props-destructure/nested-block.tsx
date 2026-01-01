import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  if (true) {
    const { foo } = props
    return () => <div>{foo}</div>
  }
  return () => <div>{props.foo}</div>
}
