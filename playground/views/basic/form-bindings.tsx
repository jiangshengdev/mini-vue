import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const FormBindings: SetupComponent = () => {
  const text = state('Edit me')
  const checked = state(true)
  const checkedNames = state<string[]>(['Jack'])
  const picked = state('One')
  const selected = state('A')
  const multiSelected = state<string[]>(['A'])

  const updateText = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    text.set((target as HTMLInputElement).value)
  }

  const updateChecked = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    checked.set((target as HTMLInputElement).checked)
  }

  const updateCheckedNames = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    const input = target as HTMLInputElement
    const { value } = input

    if (input.checked) {
      if (!checkedNames.get().includes(value)) {
        checkedNames.get().push(value)
      }

      return
    }

    checkedNames.set(
      checkedNames.get().filter((name) => {
        return name !== value
      }),
    )
  }

  const updatePicked = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    picked.set((target as HTMLInputElement).value)
  }

  const updateSelected = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    selected.set((target as HTMLSelectElement).value)
  }

  const updateMultiSelected = (event: Event): void => {
    const { target } = event

    if (!target) {
      return
    }

    const select = target as HTMLSelectElement

    multiSelected.set(
      [...select.selectedOptions].map((option) => {
        return option.value
      }),
    )
  }

  return () => {
    return (
      <section
        class="card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}
      >
        <h2>Form Bindings</h2>

        <div>
          <h3>Text Input</h3>
          <input value={text.get()} onInput={updateText} />
          <p>{text.get()}</p>
        </div>

        <div>
          <h3>Checkbox</h3>
          <input type="checkbox" id="checkbox" checked={checked.get()} onInput={updateChecked} />
          <label for="checkbox">Checked: {String(checked.get())}</label>
        </div>

        <div>
          <h3>Multi Checkbox</h3>
          <input
            type="checkbox"
            id="jack"
            value="Jack"
            checked={checkedNames.get().includes('Jack')}
            onInput={updateCheckedNames}
          />
          <label for="jack">Jack</label>
          <input
            type="checkbox"
            id="john"
            value="John"
            checked={checkedNames.get().includes('John')}
            onInput={updateCheckedNames}
          />
          <label for="john">John</label>
          <input
            type="checkbox"
            id="mike"
            value="Mike"
            checked={checkedNames.get().includes('Mike')}
            onInput={updateCheckedNames}
          />
          <label for="mike">Mike</label>
          <p>Checked names: {checkedNames.get().join(', ') || 'None'}</p>
        </div>

        <div>
          <h3>Radio</h3>
          <input
            type="radio"
            id="one"
            value="One"
            checked={picked.get() === 'One'}
            onInput={updatePicked}
          />
          <label for="one">One</label>
          <br />
          <input
            type="radio"
            id="two"
            value="Two"
            checked={picked.get() === 'Two'}
            onInput={updatePicked}
          />
          <label for="two">Two</label>
          <p>Picked: {picked.get()}</p>
        </div>

        <div>
          <h3>Select</h3>
          <select value={selected.get()} onChange={updateSelected}>
            <option disabled value="">
              Please select one
            </option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p>Selected: {selected.get()}</p>
        </div>

        <div>
          <h3>Multi Select</h3>
          <select multiple style={{ width: '100px' }} onChange={updateMultiSelected}>
            <option value="A" selected={multiSelected.get().includes('A')}>
              A
            </option>
            <option value="B" selected={multiSelected.get().includes('B')}>
              B
            </option>
            <option value="C" selected={multiSelected.get().includes('C')}>
              C
            </option>
          </select>
          <p>Selected: {multiSelected.get().join(', ') || 'None'}</p>
        </div>
      </section>
    )
  }
}
