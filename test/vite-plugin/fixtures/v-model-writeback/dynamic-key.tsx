const ModelComp = (props: {
  modelValue?: string
  'onUpdate:modelValue'?: (value: string) => void
}) => {
  return () => <div>{props.modelValue}</div>
}

const key = 'foo'
const state = { foo: 'bar' }
const node = <ModelComp v-model={state[key]} />
void node
