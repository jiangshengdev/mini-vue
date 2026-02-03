import { useCounterStore } from '../stores/counter-store.ts'
import type { SetupComponent } from '@/index.ts'
import { storeToRefs } from '@/index.ts'

const CounterControls: SetupComponent = () => {
  const store = useCounterStore()

  return () => {
    return (
      <div class="card">
        <h3>操作区（组件 A）</h3>
        <button type="button" onClick={() => store.dec()}>
          -1
        </button>
        <button type="button" onClick={() => store.inc()}>
          +1
        </button>
        <button type="button" onClick={() => store.reset()}>
          reset
        </button>
      </div>
    )
  }
}

const CounterReadout: SetupComponent = () => {
  const store = useCounterStore()
  const { count, doubled } = storeToRefs(store)

  return () => {
    return (
      <div class="card">
        <h3>展示区（组件 B）</h3>
        <p>
          count: <strong>{count.value}</strong>
        </p>
        <p>
          doubled: <strong>{doubled.value}</strong>
        </p>
      </div>
    )
  }
}

export const PiniaDemo: SetupComponent = () => {
  return () => {
    return (
      <div class="card">
        <h2>Pinia（最小实现）示例</h2>
        <p>两个组件共享同一个 store；使用 storeToRefs 解构 ref/computed 字段。</p>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <CounterControls />
          <CounterReadout />
        </div>
      </div>
    )
  }
}

