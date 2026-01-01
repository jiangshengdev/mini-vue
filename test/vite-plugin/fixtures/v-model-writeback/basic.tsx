import { ref } from '@/index.ts'

const ModelComp = (props: {
  modelValue?: string
  'onUpdate:modelValue'?: (value: string) => void
}) => {
  return () => <div>{props.modelValue}</div>
}

const model = ref('text')
const node = <ModelComp v-model={model.value} />
void node
