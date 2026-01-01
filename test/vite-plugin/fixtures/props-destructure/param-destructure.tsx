import type { SetupComponent } from '@/index.ts'

export const App: SetupComponent = ({ foo, bar }) => {
  return () => {
    return (
      <div>
        {foo}
        {bar}
      </div>
    )
  }
}
