const ModelComp = (props: {
  modelValue?: string
  'onUpdate:modelValue'?: (value: string) => void
}) => {
  return () => <div>{props.modelValue}</div>
}

const state = { form: { foo: { bar: 'baz' } } }
const node = <ModelComp v-model={state.form['foo'].bar} />
void node
