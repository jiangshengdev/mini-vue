import type { SetupComponent } from '@/index.ts'
import { state } from '@/index.ts'

export const ConditionalsAndLoops: SetupComponent = () => {
  const show = state(true)
  const list = state<number[]>([1, 2, 3])

  const toggleShow = (): void => {
    show.set(!show.get())
  }

  const pushNumber = (): void => {
    list.get().push(list.get().length + 1)
  }

  const popNumber = (): void => {
    list.get().pop()
  }

  const reverseList = (): void => {
    list.get().reverse()
  }

  const renderList = () => {
    if (show.get() && list.get().length > 0) {
      return (
        <ul>
          {list.get().map((item) => {
            return <li key={item}>{item}</li>
          })}
        </ul>
      )
    }

    if (list.get().length > 0) {
      return <p>List is not empty, but hidden.</p>
    }

    return <p>List is empty.</p>
  }

  return () => {
    return (
      <section class="card">
        <h2>Conditionals and Loops</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={toggleShow}>
            Toggle List
          </button>
          <button type="button" onClick={pushNumber}>
            Push Number
          </button>
          <button type="button" onClick={popNumber}>
            Pop Number
          </button>
          <button type="button" onClick={reverseList}>
            Reverse List
          </button>
        </div>
        {renderList()}
      </section>
    )
  }
}
