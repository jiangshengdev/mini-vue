import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = (props) => {
  const { foo } = props
  const value = foo + 1
  return () => (
    <div>
      {foo}
      {value}
    </div>
  )
}
