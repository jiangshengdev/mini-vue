import type { SetupComponent } from '@/index.ts'

export const Inner: SetupComponent = () => {
  return () => {
    return <div>inner</div>
  }
}

export const App: SetupComponent = () => {
  const Nested: SetupComponent = () => {
    return () => {
      return <span>nested</span>
    }
  }

  return () => {
    return (
      <div>
        <Inner />
        <Nested />
      </div>
    )
  }
}
