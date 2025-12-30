import { describe, expect, it } from 'vitest'
import { spyOnConsole } from '$/test-utils/mocks.ts'
import type { SetupComponent } from '@/index.ts'
import { h, ref } from '@/index.ts'
import { jsxModelBindingConflictWarning } from '@/messages/index.ts'

describe('jsx-runtime component v-model', () => {
  it('转换为 modelValue + onUpdate:modelValue 并写入 ref', () => {
    const model = ref('hello')

    const ModelComponent: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const virtualNode = <ModelComponent v-model={model} />

    expect(virtualNode.props?.modelValue).toBe('hello')
    const update = (virtualNode.props as Record<string, unknown> | undefined)?.[
      'onUpdate:modelValue'
    ] as ((value: unknown) => void) | undefined

    update?.('next')

    expect(model.value).toBe('next')
  })

  it('显式传入 modelValue/onUpdate:modelValue 时会告警并被 v-model 覆盖', () => {
    const warn = spyOnConsole('warn')
    const model = ref('from-model')

    const ModelComponent: SetupComponent = () => {
      return () => {
        return undefined
      }
    }

    const rawProps = {
      'v-model': model,
      modelValue: 'explicit',
    } as unknown as Record<string, unknown>

    rawProps['onUpdate:modelValue'] = () => {
      throw new Error('不应调用显式 onUpdate:modelValue')
    }

    const virtualNode = h(ModelComponent, rawProps)

    expect(warn).toHaveBeenCalledWith(
      jsxModelBindingConflictWarning('ModelComponent', ['modelValue', 'onUpdate:modelValue']),
      expect.any(Object),
    )

    expect((virtualNode.props as Record<string, unknown> | undefined)?.modelValue).toBe(
      'from-model',
    )
    const patchedUpdate = (virtualNode.props as Record<string, unknown> | undefined)?.[
      'onUpdate:modelValue'
    ] as ((value: unknown) => void) | undefined

    patchedUpdate?.('patched')

    expect(model.value).toBe('patched')
  })
})
