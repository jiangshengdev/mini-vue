const state = { form: { foo: { bar: 'baz' } } }
const node = <ModelComp v-model={state.form['foo'].bar} />
