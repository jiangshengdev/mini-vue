import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  foo = 1
  return () => <div />
}
