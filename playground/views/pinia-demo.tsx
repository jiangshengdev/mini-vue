import { useCounterStore } from '../stores/counter-store.ts'
import type { SetupComponent } from '@/index.ts'
import { storeToRefs } from '@/index.ts'

interface CounterPanelProps {
  title: string
}

const CounterControls: SetupComponent<CounterPanelProps> = (props) => {
  const store = useCounterStore()

  return () => {
    return (
      <div class="card">
        <h3>{props.title}</h3>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button
            type="button"
            onClick={() => {
              store.dec()
            }}
          >
            -1
          </button>
          <button
            type="button"
            onClick={() => {
              store.inc()
            }}
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => {
              store.reset()
            }}
          >
            reset
          </button>
        </div>
      </div>
    )
  }
}

const CounterReadout: SetupComponent<CounterPanelProps> = (props) => {
  const store = useCounterStore()
  const { count, doubled } = storeToRefs(store)

  return () => {
    return (
      <div class="card">
        <h3>{props.title}</h3>
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
        <p>4 个组件共享同一个 store：2 份控制区 + 2 份展示区。</p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <CounterControls title="控制区（组件 A）" />
            <CounterControls title="控制区（组件 B）" />
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <CounterReadout title="展示区（组件 C）" />
            <CounterReadout title="展示区（组件 D）" />
          </div>
        </div>
      </div>
    )
  }
}
