import { errorContexts, errorPhases, runThrowing } from '@/shared/index.ts'

const runner = () => {}

runThrowing(runner, {
  origin: errorContexts.effectRunner,
  handlerPhase: errorPhases.sync,
})

runThrowing(runner, {
  origin: errorContexts.effectRunner,
  // @ts-expect-error runThrowing 不支持异步 handlerPhase，避免同步抛错叠加异步重抛
  handlerPhase: errorPhases.async,
})
