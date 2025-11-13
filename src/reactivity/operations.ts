/**
 * Vue 官方实现通过 targetMap(WeakMap<object, Map<PropertyKey, Dep>>) 记录依赖。
 * 这里预先铺设同样的结构，未来接入 effect 时再将 Dep 与 ReactiveEffect 关联。
 */
type DepPlaceholder = Set<unknown>
type KeyToDepMap = Map<PropertyKey, DepPlaceholder>

const targetMap = new WeakMap<object, KeyToDepMap>()

/**
 * 预留依赖收集逻辑：当前仅维护 target/key 的层级结构。
 */
export function track(target: object, key: PropertyKey) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  if (!depsMap.has(key)) {
    depsMap.set(key, new Set())
  }
}

/**
 * 预留触发逻辑：Vue 会在此遍历 dep 并调度 ReactiveEffect.run。
 */
export function trigger(target: object, key: PropertyKey) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const _deps = depsMap.get(key)
  // 仅访问预留的依赖集合，未来 effect 接入后改为实际调度
  void _deps
}
