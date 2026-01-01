const ModelComp = (props: { [key: string]: unknown; modelValue?: string }) => {
  return () => {
    return <div>{props.modelValue}</div>
  }
}

const state = { form: { 'foo-bar': { bar: 'baz' } } }
const node = <ModelComp v-model={state.form['foo-bar'].bar} />

void node
