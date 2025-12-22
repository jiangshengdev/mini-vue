import { jsxModelBindingReadonlyTarget } from '@/messages/index.ts'
import { isRef } from '@/reactivity/index.ts'
import { __DEV__ } from '@/shared/index.ts'

export function readModelValue(modelBinding: unknown): unknown {
  return isRef(modelBinding) ? modelBinding.value : modelBinding
}

export function setModelValue(modelBinding: unknown, value: unknown): void {
  if (isRef(modelBinding)) {
    ;(modelBinding as { value: unknown }).value = value

    return
  }

  if (__DEV__) {
    console.warn(jsxModelBindingReadonlyTarget, modelBinding)
  }
}
