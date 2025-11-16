import { effectScope } from '../../internals/effectScope.ts'
import type { DepTarget } from './types.ts'
import type { Dep, EffectInstance } from '../../shared/types.ts'

export function trackRefValue(target: DepTarget) {
  const activeEffect = effectScope.current

  if (!activeEffect) {
    return
  }

  const { dep } = target

  if (dep.has(activeEffect)) {
    return
  }

  dep.add(activeEffect)
  activeEffect.recordDependency(dep)
}

export function triggerRefValue(target: DepTarget) {
  if (target.dep.size === 0) {
    return
  }

  for (const effect of snapshotEffects(target.dep)) {
    if (shouldRun(effect)) {
      effect.run()
    }
  }
}

function snapshotEffects(dep: Dep): Dep {
  return new Set(dep)
}

function shouldRun(effect: EffectInstance) {
  return effect !== effectScope.current && effect.active
}
