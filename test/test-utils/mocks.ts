import type { MockInstance } from 'vitest'
import { vi } from 'vitest'

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn'

export function spyOnConsole<T extends ConsoleMethod>(
  method: T,
): MockInstance<Console[T]> {
  return vi
    .spyOn(console, method)
    .mockImplementation(() => {
      return undefined
    }) as MockInstance<Console[T]>
}

export function stubGlobalQueueMicrotask(): {
  callbacks: Array<() => void>
  queueMicrotask: MockInstance<(callback: () => void) => void>
} {
  const callbacks: Array<() => void> = []
  const queueMicrotaskSpy = vi.fn<(callback: () => void) => void>((callback) => {
    callbacks.push(callback)
  })

  vi.stubGlobal('queueMicrotask', queueMicrotaskSpy)

  return { callbacks, queueMicrotask: queueMicrotaskSpy }
}

