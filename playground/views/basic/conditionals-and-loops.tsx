import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'

export const ConditionalsAndLoops: SetupComponent = () => {
  const show = ref(true)
  const list = ref<number[]>([1, 2, 3])

  const toggleShow = (): void => {
    show.value = !show.value
  }

  const pushNumber = (): void => {
    list.value.push(list.value.length + 1)
  }

  const popNumber = (): void => {
    list.value.pop()
  }

  const reverseList = (): void => {
    list.value.reverse()
  }

  const renderList = () => {
    if (show.value && list.value.length > 0) {
      return (
        <ul>
          {list.value.map((item) => {
            return <li key={item}>{item}</li>
          })}
        </ul>
      )
    }

    if (list.value.length > 0) {
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
