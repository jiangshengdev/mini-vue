import { describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { renderIntoNewContainer } from '$/index.ts'
import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'
import {
  jsxModelBindingConflictWarning,
  jsxModelBindingNonFormWarning,
  jsxModelBindingReadonlyTarget,
} from '@/messages/index.ts'

describe('runtime-dom JSX v-model', () => {
  it('文本输入使用 onInput 双向绑定值', async () => {
    const text = ref('hello')

    const InputBinder: SetupComponent = () => {
      return () => {
        return <input aria-label="text" v-model={text} />
      }
    }

    const container = renderIntoNewContainer(<InputBinder />)
    const input = within(container).getByLabelText('text') as HTMLInputElement
    const user = userEvent.setup()

    expect(input.value).toBe('hello')

    input.value = 'mini-vue'
    input.dispatchEvent(new Event('input'))

    expect(text.value).toBe('mini-vue')

    text.value = 'patched'

    expect(input.value).toBe('patched')

    await user.type(input, '!')

    expect(text.value).toBe('patched!')
  })

  it('checkbox 支持布尔模型', async () => {
    const checked = ref(true)

    const CheckboxBinder: SetupComponent = () => {
      return () => {
        return <input aria-label="flag" type="checkbox" v-model={checked} />
      }
    }

    const container = renderIntoNewContainer(<CheckboxBinder />)
    const input = within(container).getByLabelText('flag') as HTMLInputElement
    const user = userEvent.setup()

    expect(input.checked).toBe(true)

    await user.click(input)

    expect(checked.value).toBe(false)

    checked.value = true

    expect(input.checked).toBe(true)
  })

  it('checkbox 绑定数组时按值增删选项', async () => {
    const names = ref(['John'])

    const CheckboxGroup: SetupComponent = () => {
      return () => {
        return (
          <>
            <input aria-label="Jack" type="checkbox" value="Jack" v-model={names} />
            <input aria-label="John" type="checkbox" value="John" v-model={names} />
          </>
        )
      }
    }

    const container = renderIntoNewContainer(<CheckboxGroup />)
    const view = within(container)
    const jack = view.getByLabelText('Jack') as HTMLInputElement
    const john = view.getByLabelText('John') as HTMLInputElement
    const user = userEvent.setup()

    expect(jack.checked).toBe(false)
    expect(john.checked).toBe(true)

    await user.click(jack)

    expect(names.value).toEqual(['John', 'Jack'])

    await user.click(john)

    expect(names.value).toEqual(['Jack'])
  })

  it('radio 会按 value 严格匹配并推送变更', async () => {
    const picked = ref('A')

    const RadioGroup: SetupComponent = () => {
      return () => {
        return (
          <>
            <input aria-label="A" type="radio" name="pick" value="A" v-model={picked} />
            <input aria-label="B" type="radio" name="pick" value="B" v-model={picked} />
          </>
        )
      }
    }

    const container = renderIntoNewContainer(<RadioGroup />)
    const view = within(container)
    const radioA = view.getByLabelText('A') as HTMLInputElement
    const radioB = view.getByLabelText('B') as HTMLInputElement
    const user = userEvent.setup()

    expect(radioA.checked).toBe(true)
    expect(radioB.checked).toBe(false)

    await user.click(radioB)

    expect(picked.value).toBe('B')
    expect(radioA.checked).toBe(false)
    expect(radioB.checked).toBe(true)
  })

  it('select 单选绑定 value，change 后更新 ref', async () => {
    const selected = ref('b')

    const SelectBinder: SetupComponent = () => {
      return () => {
        return (
          <select aria-label="single" v-model={selected}>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
          </select>
        )
      }
    }

    const container = renderIntoNewContainer(<SelectBinder />)

    const select = within(container).getByLabelText('single') as HTMLSelectElement

    await Promise.resolve()

    expect(select.value).toBe('b')

    select.value = 'c'
    select.dispatchEvent(new Event('change'))

    expect(selected.value).toBe('c')

    selected.value = 'a'

    await Promise.resolve()

    expect(select.value).toBe('a')
  })

  it('select 多选根据数组同步选中项并推送新数组', async () => {
    const selected = ref(['a'])

    const SelectBinder: SetupComponent = () => {
      return () => {
        return (
          <select aria-label="multi" multiple v-model={selected}>
            <option value="a">A</option>
            <option value="b">B</option>
            <option value="c">C</option>
          </select>
        )
      }
    }

    const container = renderIntoNewContainer(<SelectBinder />)

    const select = within(container).getByLabelText('multi') as HTMLSelectElement
    const user = userEvent.setup()

    await Promise.resolve()

    expect([...select.selectedOptions].map((option) => option.value)).toEqual(['a'])

    selected.value = ['b', 'c']

    await Promise.resolve()

    expect([...select.selectedOptions].map((option) => option.value)).toEqual(['b', 'c'])

    for (const option of select.options) {
      option.selected = option.value === 'a' || option.value === 'c'
    }

    select.dispatchEvent(new Event('change'))

    expect(selected.value).toEqual(['a', 'c'])
  })

  it('开发期对非表单元素与冲突属性给出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const text = ref('x')

    renderIntoNewContainer(<div v-model={text} />)

    expect(warn).toHaveBeenCalledWith(jsxModelBindingNonFormWarning('div'), {
      'v-model': text,
    })

    warn.mockClear()

    renderIntoNewContainer(
      <input aria-label="conflict" v-model={text} value="raw" onInput={() => undefined} />,
    )

    expect(warn).toHaveBeenCalledWith(
      jsxModelBindingConflictWarning('input', ['value', 'onInput']),
    )

    warn.mockRestore()
  })

  it('绑定到非 ref 目标时写入会警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return undefined
    })
    const container = renderIntoNewContainer(<input aria-label="readonly" v-model={'fixed'} />)
    const input = within(container).getByLabelText('readonly') as HTMLInputElement

    input.value = 'next'
    input.dispatchEvent(new Event('input'))

    expect(warn).toHaveBeenCalledWith(jsxModelBindingReadonlyTarget, 'fixed')

    warn.mockRestore()
  })
})
