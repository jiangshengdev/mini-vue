import { effectScope } from './effectScope.ts'
import type { Dep, EffectInstance } from '../shared/types.ts'

export function collectEffect(dep: Dep) {
  const currentEffect = effectScope.current

  if (!currentEffect) {
    return
  }

  if (dep.has(currentEffect)) {
    return
  }

  dep.add(currentEffect)
  currentEffect.recordDependency(dep)
}

export function dispatchEffects(dep: Dep) {
  if (dep.size === 0) {
    return
  }

  for (const effect of snapshot(dep)) {
    if (shouldRun(effect)) {
      effect.run()
    }
  }
}

function snapshot(dep: Dep): Dep {
  return new Set(dep)
}

function shouldRun(effect: EffectInstance) {
  return effect !== effectScope.current && effect.active
}
