export const App = (props: { foo: string }) => {
  const { foo } = props
  return () => <div>{foo}</div>
}
