import { effectScope } from './effectScope.ts'
import type { Dep, EffectInstance } from '../shared/types.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 */
class DepRegistry {
  private readonly targetMap = new WeakMap<object, Map<PropertyKey, Dep>>()

  track(target: object, key: PropertyKey) {
    const currentEffect = effectScope.current
    if (!currentEffect) {
      return
    }

    const dep = this.ensureDep(target, key)
    if (dep.has(currentEffect)) {
      return
    }

    dep.add(currentEffect)
    currentEffect.recordDependency(dep)
  }

  trigger(target: object, key: PropertyKey) {
    const dep = this.existingDep(target, key)
    if (!dep) {
      return
    }

    for (const effect of this.snapshot(dep)) {
      if (this.shouldRun(effect)) {
        effect.run()
      }
    }
  }

  private ensureDep(target: object, key: PropertyKey): Dep {
    let depsMap = this.targetMap.get(target)
    if (!depsMap) {
      depsMap = new Map()
      this.targetMap.set(target, depsMap)
    }

    let dep = depsMap.get(key)
    if (!dep) {
      dep = new Set()
      depsMap.set(key, dep)
    }
    return dep
  }

  private existingDep(target: object, key: PropertyKey) {
    return this.targetMap.get(target)?.get(key)
  }

  private snapshot(dep: Dep): Dep {
    return new Set(dep)
  }

  private shouldRun(effect: EffectInstance) {
    return effect !== effectScope.current && effect.active
  }
}

const registry = new DepRegistry()

export function track(target: object, key: PropertyKey) {
  registry.track(target, key)
}

export function trigger(target: object, key: PropertyKey) {
  registry.trigger(target, key)
}
