export const App = (props: { foo: string }) => {
  const { foo } = props

  return () => {
    return <div>{foo}</div>
  }
}
