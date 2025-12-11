import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const FormBindingsView: SetupComponent = () => {
  const text = ref('Edit me')
  const checked = ref(true)
  const checkedNames = ref<string[]>(['Jack'])
  const picked = ref('One')
  const selected = ref('A')
  const multiSelected = ref<string[]>(['A'])

  const updateText = (event: Event): void => {
    const target = event.target as HTMLInputElement | null

    text.value = target?.value ?? ''
  }

  const updateChecked = (event: Event): void => {
    const target = event.target as HTMLInputElement | null

    checked.value = target?.checked ?? false
  }

  const updateCheckedNames = (event: Event): void => {
    const target = event.target as HTMLInputElement | null

    if (!target) {
      return
    }

    const value = target.value

    if (target.checked) {
      if (!checkedNames.value.includes(value)) {
        checkedNames.value.push(value)
      }

      return
    }

    checkedNames.value = checkedNames.value.filter((name) => name !== value)
  }

  const updatePicked = (event: Event): void => {
    const target = event.target as HTMLInputElement | null

    picked.value = target?.value ?? ''
  }

  const updateSelected = (event: Event): void => {
    const target = event.target as HTMLSelectElement | null

    selected.value = target?.value ?? ''
  }

  const updateMultiSelected = (event: Event): void => {
    const target = event.target as HTMLSelectElement | null

    if (!target) {
      return
    }

    multiSelected.value = Array.from(target.selectedOptions).map((option) => option.value)
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
          <input value={text.value} onInput={updateText} />
          <p>{text.value}</p>
        </div>

        <div>
          <h3>Checkbox</h3>
          <input type="checkbox" id="checkbox" checked={checked.value} onInput={updateChecked} />
          <label for="checkbox">Checked: {String(checked.value)}</label>
        </div>

        <div>
          <h3>Multi Checkbox</h3>
          <input
            type="checkbox"
            id="jack"
            value="Jack"
            checked={checkedNames.value.includes('Jack')}
            onInput={updateCheckedNames}
          />
          <label for="jack">Jack</label>
          <input
            type="checkbox"
            id="john"
            value="John"
            checked={checkedNames.value.includes('John')}
            onInput={updateCheckedNames}
          />
          <label for="john">John</label>
          <input
            type="checkbox"
            id="mike"
            value="Mike"
            checked={checkedNames.value.includes('Mike')}
            onInput={updateCheckedNames}
          />
          <label for="mike">Mike</label>
          <p>Checked names: {checkedNames.value.join(', ') || 'None'}</p>
        </div>

        <div>
          <h3>Radio</h3>
          <input
            type="radio"
            id="one"
            value="One"
            checked={picked.value === 'One'}
            onInput={updatePicked}
          />
          <label for="one">One</label>
          <br />
          <input
            type="radio"
            id="two"
            value="Two"
            checked={picked.value === 'Two'}
            onInput={updatePicked}
          />
          <label for="two">Two</label>
          <p>Picked: {picked.value}</p>
        </div>

        <div>
          <h3>Select</h3>
          <select value={selected.value} onInput={updateSelected}>
            <option disabled value="">
              Please select one
            </option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p>Selected: {selected.value}</p>
        </div>

        <div>
          <h3>Multi Select</h3>
          <select
            value={multiSelected.value}
            multiple
            style={{ width: '100px' }}
            onInput={updateMultiSelected}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p>Selected: {multiSelected.value.join(', ') || 'None'}</p>
        </div>
      </section>
    )
  }
}
