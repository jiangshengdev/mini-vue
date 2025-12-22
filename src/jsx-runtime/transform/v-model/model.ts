import { jsxModelBindingReadonlyTarget } from '@/messages/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { __DEV__ } from '@/shared/index.ts'

export function readModelValue(model: unknown): unknown {
  return isRef(model) ? model.value : model
}

export function setModelValue(model: unknown, value: unknown): void {
  if (isRef(model)) {
    ;(model as { value: unknown }).value = value

    return
  }

  if (__DEV__) {
    console.warn(jsxModelBindingReadonlyTarget, model)
  }
}
