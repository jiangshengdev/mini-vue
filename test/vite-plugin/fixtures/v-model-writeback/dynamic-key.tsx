const ModelComp = (props: { [key: string]: unknown; modelValue?: string }) => {
  return () => {
    return <div>{props.modelValue}</div>
  }
}

const key = 'foo'
const state = { foo: 'bar' }
const node = <ModelComp v-model={state[key]} />

void node
