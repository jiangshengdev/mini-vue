import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  if (props.foo) {
    const { foo } = props

    return () => {
      return <div>{foo}</div>
    }
  }

  return () => {
    return <div>{props.foo}</div>
  }
}
