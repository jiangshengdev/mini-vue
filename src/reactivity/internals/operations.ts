import type { DependencyBucket, ReactiveTarget } from '../shared/types.ts'
import {
  iterateKey,
  type TriggerOpType,
  triggerOpTypes,
} from '../shared/constants.ts'
import { trackEffect, triggerEffects } from './dep-utils.ts'
import { isIntegerKey } from '@/shared/utils.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 */
class DepRegistry {
  /**
   * 使用 WeakMap 建立目标对象到属性依赖集合的索引结构。
   */
  private readonly targetMap = new WeakMap<
    ReactiveTarget,
    Map<PropertyKey, DependencyBucket>
  >()

  /**
   * 把当前活跃副作用加入目标字段的依赖集合。
   */
  track(target: ReactiveTarget, key: PropertyKey): void {
    /* 获取或创建目标字段对应的依赖集合 */
    const dep = this.getOrCreateDep(target, key)

    trackEffect(dep)
  }

  /**
   * 触发指定字段的依赖集合，逐个执行对应副作用。
   */
  trigger(
    target: ReactiveTarget,
    key: PropertyKey,
    type: TriggerOpType,
    newValue?: unknown,
  ): void {
    const depsMap = this.targetMap.get(target)

    if (!depsMap) {
      return
    }

    /* 通过 Set 去重同一次触发中出现的重复依赖。 */
    const depsToRun = new Set<DependencyBucket>()

    /* 工具函数：跳过空集合并统一去重逻辑。 */
    const addDep = (dep?: DependencyBucket) => {
      if (!dep) {
        return
      }

      depsToRun.add(dep)
    }

    /* 首先加入当前字段的直接依赖。 */
    addDep(depsMap.get(key))

    if (type === triggerOpTypes.add || type === triggerOpTypes.delete) {
      /* 结构性变化会影响 for...in/Object.keys，因此额外触发 iterate 依赖。 */
      addDep(depsMap.get(iterateKey))
    }

    if (Array.isArray(target)) {
      if (type === triggerOpTypes.add && isIntegerKey(key)) {
        /* 数组新增索引意味着 length 变化，需要同步触发 length 依赖。 */
        addDep(depsMap.get('length'))
      }

      if (key === 'length') {
        for (const [depKey, dep] of depsMap.entries()) {
          if (depKey === 'length') {
            addDep(dep)

            continue
          }

          if (
            isIntegerKey(depKey) &&
            typeof newValue === 'number' &&
            Number(depKey) >= newValue
          ) {
            /* 截断 length 会影响被裁剪索引的副作用。 */
            addDep(dep)
          }
        }

        /* `length` 变化也会影响遍历结果。 */
        addDep(depsMap.get(iterateKey))
      }
    }

    if (depsToRun.size === 0) {
      /* 没有任何依赖被收集时直接返回，避免多余遍历。 */
      return
    }

    for (const dep of depsToRun) {
      triggerEffects(dep)
    }
  }

  /**
   * 确保目标字段具备依赖集合，不存在时创建新集合。
   */
  private getOrCreateDep(
    target: ReactiveTarget,
    key: PropertyKey,
  ): DependencyBucket {
    /* 读取或初始化目标对象的依赖映射表 */
    let depsMap = this.targetMap.get(target)

    if (!depsMap) {
      depsMap = new Map()
      this.targetMap.set(target, depsMap)
    }

    /* 读取或初始化目标字段的副作用集合 */
    let dep = depsMap.get(key)

    if (!dep) {
      dep = new Set()
      depsMap.set(key, dep)
    }

    return dep
  }
}

const registry = new DepRegistry()

/** 响应式系统对外暴露的依赖收集入口。 */
export function track(target: ReactiveTarget, key: PropertyKey): void {
  registry.track(target, key)
}

/**
 * 响应式系统对外暴露的触发入口，参数与 DepRegistry.trigger 对齐。
 */
export function trigger(
  target: ReactiveTarget,
  key: PropertyKey,
  type: TriggerOpType,
  newValue?: unknown,
): void {
  registry.trigger(target, key, type, newValue)
}
