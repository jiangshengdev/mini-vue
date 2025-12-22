import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const FormBindings: SetupComponent = () => {
  const text = state('Edit me')
  const checked = state(true)
  const checkedNames = state<string[]>(['Jack'])
  const picked = state('One')
  const selected = state('A')
  const multiSelected = state<string[]>(['A'])

  return () => {
    return (
      <section
        class="card"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}
      >
        <h2>Form Bindings</h2>

        <div>
          <h3>Text Input</h3>
          <input v-model={text} />
          <p>{text.get()}</p>
        </div>

        <div>
          <h3>Checkbox</h3>
          <input type="checkbox" id="checkbox" v-model={checked} />
          <label for="checkbox">Checked: {String(checked.get())}</label>
        </div>

        <div>
          <h3>Multi Checkbox</h3>
          <input type="checkbox" id="jack" value="Jack" v-model={checkedNames} />
          <label for="jack">Jack</label>
          <input type="checkbox" id="john" value="John" v-model={checkedNames} />
          <label for="john">John</label>
          <input type="checkbox" id="mike" value="Mike" v-model={checkedNames} />
          <label for="mike">Mike</label>
          <p>Checked names: {checkedNames.get().join(', ') || 'None'}</p>
        </div>

        <div>
          <h3>Radio</h3>
          <input type="radio" id="one" value="One" v-model={picked} />
          <label for="one">One</label>
          <br />
          <input type="radio" id="two" value="Two" v-model={picked} />
          <label for="two">Two</label>
          <p>Picked: {picked.get()}</p>
        </div>

        <div>
          <h3>Select</h3>
          <select v-model={selected}>
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
          <select multiple style={{ width: '100px' }} v-model={multiSelected}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p>Selected: {multiSelected.get().join(', ') || 'None'}</p>
        </div>
      </section>
    )
  }
}
