import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent<{ foo: number }> = (props) => {
  const { foo } = props
  const value = foo + 1

  return () => {
    return (
      <div>
        {foo}
        {value}
      </div>
    )
  }
}
