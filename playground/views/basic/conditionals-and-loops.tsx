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
      return <p>列表非空，但已隐藏。</p>
    }

    return <p>列表为空。</p>
  }

  return () => {
    return (
      <section class="card">
        <h2>条件与循环</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={toggleShow}>
            切换列表
          </button>
          <button type="button" onClick={pushNumber}>
            追加数字
          </button>
          <button type="button" onClick={popNumber}>
            移除数字
          </button>
          <button type="button" onClick={reverseList}>
            反转列表
          </button>
        </div>
        {renderList()}
      </section>
    )
  }
}
