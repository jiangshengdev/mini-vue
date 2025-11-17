import { effectScope } from './effectScope.ts'
import type { Dep, EffectInstance } from '../shared/types.ts'

/**
 * 收集当前活跃的副作用到依赖集合，确保后续触发时能够回调。
 */
export function collectEffect(dep: Dep) {
  const currentEffect = effectScope.current

  /* 没有激活的副作用时直接返回，避免空收集开销 */
  if (!currentEffect) {
    return
  }

  /* 已存在于集合中的副作用无需重复登记，防止死循环 */
  if (dep.has(currentEffect)) {
    return
  }

  /* 建立双向关联：依赖记录副作用，副作用记录关联的依赖 */
  dep.add(currentEffect)
  currentEffect.recordDependency(dep)
}

/**
 * 触发依赖集合中的副作用，按照快照顺序执行 run。
 */
export function dispatchEffects(dep: Dep) {
  /* 空集合无需触发，快速退出 */
  if (dep.size === 0) {
    return
  }

  /* 使用快照避免遍历过程中依赖集合被修改 */
  for (const effect of snapshot(dep)) {
    /* 仅执行仍处于活跃状态的副作用，跳过当前 effect */
    if (shouldRun(effect)) {
      schedule(effect)
    }
  }
}

/**
 * 拷贝一份依赖集合，保证触发期间的稳定遍历。
 */
function snapshot(dep: Dep): Dep {
  return new Set(dep)
}

/**
 * 判断副作用是否应在当前调度周期内运行。
 */
function shouldRun(effect: EffectInstance) {
  /* 避免重复执行当前 effect，并确保目标 effect 尚未停止 */
  return effect !== effectScope.current && effect.active
}

function schedule(effect: EffectInstance) {
  const scheduler = effect.scheduler

  if (scheduler) {
    const job = () => {
      if (effect.active) {
        effect.run()
      }
    }

    scheduler(job)

    return
  }

  effect.run()
}
