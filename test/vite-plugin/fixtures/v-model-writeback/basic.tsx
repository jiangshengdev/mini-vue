import { ref } from '@/index.ts'

const ModelComp = (props: { [key: string]: unknown; modelValue?: string }) => {
  return () => {
    return <div>{props.modelValue}</div>
  }
}

const model = ref('text')
const node = <ModelComp v-model={model.value} />

void node
