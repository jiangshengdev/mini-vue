import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const FormBindings: SetupComponent = () => {
  const text = state('编辑我')
  const checked = state(true)
  const checkedNames = state<string[]>(['Jack'])
  const picked = state('选项一')
  const selected = state('A')
  const multiSelected = state<string[]>(['A'])

  return () => {
    return (
      <section
        class="card"
        data-testid="basic-form-bindings"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}
      >
        <h2>表单绑定</h2>

        <div>
          <h3>文本输入</h3>
          <input data-testid="form-bindings-text-input" v-model={text} />
          <p data-testid="form-bindings-text-output">当前值：{text.get()}</p>
        </div>

        <div>
          <h3>复选框</h3>
          <input
            data-testid="form-bindings-single-checkbox"
            type="checkbox"
            id="checkbox"
            v-model={checked}
          />
          <label for="checkbox">已勾选：{String(checked.get())}</label>
        </div>

        <div>
          <h3>多选框</h3>
          <input type="checkbox" id="jack" value="Jack" v-model={checkedNames} />
          <label for="jack">Jack</label>
          <input type="checkbox" id="john" value="John" v-model={checkedNames} />
          <label for="john">John</label>
          <input type="checkbox" id="mike" value="Mike" v-model={checkedNames} />
          <label for="mike">Mike</label>
          <p data-testid="form-bindings-checked-names-output">
            已勾选姓名：{checkedNames.get().join(', ') || '无'}
          </p>
        </div>

        <div>
          <h3>单选框</h3>
          <input type="radio" id="one" value="选项一" v-model={picked} />
          <label for="one">选项一</label>
          <br />
          <input type="radio" id="two" value="选项二" v-model={picked} />
          <label for="two">选项二</label>
          <p>已选择：{picked.get()}</p>
        </div>

        <div>
          <h3>下拉选择</h3>
          <select data-testid="form-bindings-single-select" v-model={selected}>
            <option disabled value="">
              请选择一项
            </option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p data-testid="form-bindings-single-select-output">已选择：{selected.get()}</p>
        </div>

        <div>
          <h3>多选下拉</h3>
          <select
            data-testid="form-bindings-multi-select"
            multiple
            style={{ width: '100px' }}
            v-model={multiSelected}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
          <p data-testid="form-bindings-multi-select-output">
            已选择：{multiSelected.get().join(', ') || '无'}
          </p>
        </div>
      </section>
    )
  }
}
