import type { DependencyBucket, ReactiveTarget, TriggerOpType } from '../contracts/index.ts'
import { iterateDependencyKey, triggerOpTypes } from '../contracts/index.ts'
import { trackEffect, triggerEffects } from './dependency-utils.ts'
import { effectStack } from './effect-stack.ts'
import { isArrayIndex } from '@/shared/index.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 */
class DependencyRegistry {
  /**
   * 使用 WeakMap 建立目标对象到属性依赖集合的索引结构。
   */
  private readonly targetMap = new WeakMap<ReactiveTarget, Map<PropertyKey, DependencyBucket>>()

  /**
   * 把当前活跃副作用加入目标字段的依赖集合。
   */
  track(target: ReactiveTarget, key: PropertyKey): void {
    /* 没有活跃 effect 时无需创建依赖集合，直接退出节省内存。 */
    const currentEffect = effectStack.current

    if (!currentEffect) {
      return
    }

    /* 获取或创建目标字段对应的依赖集合 */
    const dependencyBucket = this.getOrCreateDep(target, key)

    trackEffect(dependencyBucket)
  }

  /**
   * 触发指定字段的依赖集合，逐个执行对应副作用。
   */
  trigger(target: ReactiveTarget, key: PropertyKey, type: TriggerOpType, newValue?: unknown): void {
    const depsMap = this.targetMap.get(target)

    if (!depsMap) {
      return
    }

    /* 通过 Set 去重同一次触发中出现的重复依赖。 */
    const depsToRun = new Set<DependencyBucket>()

    /* 工具函数：跳过空集合并统一去重逻辑。 */
    const addDep = (dependencyBucket?: DependencyBucket) => {
      if (!dependencyBucket) {
        return
      }

      depsToRun.add(dependencyBucket)
    }

    /* 首先加入当前字段的直接依赖。 */
    addDep(depsMap.get(key))

    if (type === triggerOpTypes.add || type === triggerOpTypes.delete) {
      /* 结构性变化会影响 for...in/Object.keys，因此额外触发 iterate 依赖。 */
      addDep(depsMap.get(iterateDependencyKey))
    }

    if (Array.isArray(target)) {
      if (type === triggerOpTypes.add && isArrayIndex(key)) {
        /* 数组新增索引意味着 length 变化，需要同步触发 length 依赖。 */
        addDep(depsMap.get('length'))
      }

      if (key === 'length') {
        /* 主动遍历所有已追踪的索引依赖，以判断哪些受 length 截断影响。 */
        for (const [depKey, dependencyBucket] of depsMap.entries()) {
          if (depKey === 'length') {
            addDep(dependencyBucket)

            continue
          }

          if (isArrayIndex(depKey) && typeof newValue === 'number' && Number(depKey) >= newValue) {
            /* 截断 length 会影响被裁剪索引的副作用。 */
            addDep(dependencyBucket)
          }
        }

        /* `length` 的结构变化同样会破坏遍历顺序，需要同步刷新迭代依赖。 */
        addDep(depsMap.get(iterateDependencyKey))
      }
    }

    if (depsToRun.size === 0) {
      /* 没有任何依赖被收集时直接返回，避免多余遍历。 */
      return
    }

    for (const dependencyBucket of depsToRun) {
      triggerEffects(dependencyBucket)
    }
  }

  /**
   * 确保目标字段具备依赖集合，不存在时创建新集合。
   */
  private getOrCreateDep(target: ReactiveTarget, key: PropertyKey): DependencyBucket {
    /* 读取或初始化目标对象的依赖映射表 */
    let depsMap = this.targetMap.get(target)

    if (!depsMap) {
      depsMap = new Map()
      this.targetMap.set(target, depsMap)
    }

    /* 读取或初始化目标字段的副作用集合 */
    let dependencyBucket = depsMap.get(key)

    if (!dependencyBucket) {
      dependencyBucket = new Set()
      depsMap.set(key, dependencyBucket)
    }

    return dependencyBucket
  }
}

const registry = new DependencyRegistry()

/** 响应式系统对外暴露的依赖收集入口。 */
export function track(target: ReactiveTarget, key: PropertyKey): void {
  registry.track(target, key)
}

/**
 * 响应式系统对外暴露的触发入口，参数与 DependencyRegistry.trigger 对齐。
 */
export function trigger(
  target: ReactiveTarget,
  key: PropertyKey,
  type: TriggerOpType,
  newValue?: unknown,
): void {
  registry.trigger(target, key, type, newValue)
}
