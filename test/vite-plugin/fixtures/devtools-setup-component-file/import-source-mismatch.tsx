type SetupComponent = (props: Record<string, unknown>) => () => unknown

export const App: SetupComponent = () => {
  return () => {
    return <div>noop</div>
  }
}
