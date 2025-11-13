/**
 * Vue 官方实现通过 targetMap(WeakMap<object, Map<PropertyKey, Dep>>) 记录依赖。
 * 这里同样维护 target/key → dep 的映射，配合 effect 完成依赖收集与触发。
 */
export type Dep = Set<ReactiveEffectRunner>
type KeyToDepMap = Map<PropertyKey, Dep>

export interface ReactiveEffectRunner<T = unknown> {
  deps: Dep[]

  (): T
}

const targetMap = new WeakMap<object, KeyToDepMap>()

let activeEffect: ReactiveEffectRunner | undefined
const effectStack: ReactiveEffectRunner[] = []

export function pushActiveEffect(effect: ReactiveEffectRunner) {
  effectStack.push(effect)
  activeEffect = effect
}

export function popActiveEffect() {
  effectStack.pop()
  activeEffect = effectStack[effectStack.length - 1]
}

/**
 * 在依赖读取阶段记录当前激活的 effect。
 */
export function track(target: object, key: PropertyKey) {
  const effect = activeEffect
  if (!effect) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  if (dep.has(effect)) {
    return
  }
  dep.add(effect)
  effect.deps.push(dep)
}

/**
 * 在数据变更时出发依赖的 effect 重新执行。
 */
export function trigger(target: object, key: PropertyKey) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const dep = depsMap.get(key)
  if (!dep) {
    return
  }
  const effectsToRun = new Set(dep)
  effectsToRun.forEach((effect) => {
    if (effect !== activeEffect) {
      effect()
    }
  })
}
