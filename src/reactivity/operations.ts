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

/**
 * 维护原始对象到依赖映射表的核心数据结构。
 */
const targetMap = new WeakMap<object, KeyToDepMap>()

let activeEffect: ReactiveEffectRunner | undefined
const effectStack: ReactiveEffectRunner[] = []

/**
 * 将 effect 入栈并设置为当前活跃对象，供 track 收集依赖。
 */
export function pushActiveEffect(effect: ReactiveEffectRunner) {
  effectStack.push(effect)
  activeEffect = effect
}

/**
 * 弹出当前 effect，恢复上一层活跃 effect，支持嵌套 effect。
 */
export function popActiveEffect() {
  effectStack.pop()
  activeEffect = effectStack.at(-1)
}

/**
 * 在依赖读取阶段记录当前激活的 effect。
 */
export function track(target: object, key: PropertyKey) {
  const effect = activeEffect
  if (!effect) {
    return
  }
  // 为目标对象建立依赖映射，确保后续触发能找到对应 dep
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  // 为具体属性准备依赖集合，避免不同 key 相互污染
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  if (dep.has(effect)) {
    return
  }
  // 双向记录依赖关系，便于 cleanup 时精准删除
  dep.add(effect)
  effect.deps.push(dep)
}

/**
 * 在数据变更时触发依赖的 effect 重新执行。
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
  // 使用新集合捕获当前副作用，避免触发过程中集合被修改
  const effectsToRun = new Set(dep)
  effectsToRun.forEach((effect) => {
    if (effect !== activeEffect) {
      effect()
    }
  })
}
