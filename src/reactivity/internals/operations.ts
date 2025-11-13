import { effectScope } from './effectScope.ts'
import type { Dep, ReactiveEffectRunner } from '../shared/types.ts'

/**
 * Vue 官方实现通过 targetMap(WeakMap<object, Map<PropertyKey, Dep>>) 记录依赖。
 * 这里同样维护 target/key → dep 的映射，配合 effect 完成依赖收集与触发。
 */
type KeyToDepMap = Map<PropertyKey, Dep>

/**
 * 维护原始对象到依赖映射表的核心数据结构。
 */
const targetMap = new WeakMap<object, KeyToDepMap>()

/**
 * 确保目标对象对应的依赖映射存在，并返回该映射。
 */
function depsMapFor(target: object) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  return depsMap
}

/**
 * 确保指定 key 对应的依赖集合存在，并返回该集合。
 */
function depFor(target: object, key: PropertyKey) {
  const depsMap = depsMapFor(target)
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }
  return dep
}

/**
 * 获取已存在的依赖集合；若尚未建立则返回 undefined。
 */
function existingDepFor(target: object, key: PropertyKey) {
  const depsMap = targetMap.get(target)
  return depsMap?.get(key)
}

/**
 * 判断副作用是否需要执行，跳过当前活跃副作用以避免循环触发。
 */
function shouldRunEffect(effect: ReactiveEffectRunner) {
  return effect !== effectScope.current
}

/**
 * 对依赖集合创建快照后逐一执行副作用。
 */
function runEffects(dep: Dep) {
  const effectsToRun = new Set(dep)
  effectsToRun.forEach(runEffect)
}

/**
 * 调用具体副作用函数，已确保不会执行当前活跃的 effect。
 */
function runEffect(effect: ReactiveEffectRunner) {
  if (shouldRunEffect(effect)) {
    effect()
  }
}

/**
 * 在依赖读取阶段记录当前激活的 effect。
 */
export function track(target: object, key: PropertyKey) {
  const effect = effectScope.current
  if (!effect) {
    return
  }
  // 为具体属性准备依赖集合，避免不同 key 相互污染
  const dep = depFor(target, key)
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
  const dep = existingDepFor(target, key)
  if (!dep) {
    return
  }
  // 使用具名函数触发依赖，降低内部回调嵌套
  runEffects(dep)
}
