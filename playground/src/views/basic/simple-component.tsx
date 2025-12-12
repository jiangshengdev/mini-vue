import type { SetupComponent } from '@/index.ts'
import { ref } from '@/index.ts'
import { type Todo, TodoItem } from './todo-item.tsx'

export const SimpleComponent: SetupComponent = () => {
  const groceryList = ref<Todo[]>([
    { id: 0, text: 'Vegetables' },
    { id: 1, text: 'Cheese' },
    { id: 2, text: 'Whatever else humans are supposed to eat' },
  ])

  return () => {
    return (
      <section class="card">
        <h2>Simple Component</h2>
        <ol>
          {groceryList.value.map((item) => (
            <TodoItem key={item.id} todo={item} />
          ))}
        </ol>
      </section>
    )
  }
}
