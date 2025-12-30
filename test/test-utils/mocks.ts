import type { MockInstance } from 'vitest'
import { vi } from 'vitest'

type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn'

type ConsoleProcedure = (message?: unknown, ...optionalParameters: unknown[]) => void

export function spyOnConsole(method: ConsoleMethod): MockInstance<ConsoleProcedure> {
  const spy = vi.spyOn(console, method) as unknown as MockInstance<ConsoleProcedure>

  spy.mockImplementation((..._args: unknown[]) => {
    /* No-op */
  })

  return spy
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
