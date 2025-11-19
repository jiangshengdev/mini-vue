import { trackEffect, triggerEffects } from './dep-utils.ts'
import type { DependencyBucket } from '../shared/types.ts'

/**
 * 集中管理对象属性与副作用之间的依赖关系。
 */
class DepRegistry {
  /**
   * 使用 WeakMap 建立目标对象到属性依赖集合的索引结构。
   */
  private readonly targetMap = new WeakMap<
    object,
    Map<PropertyKey, DependencyBucket>
  >()

  /**
   * 把当前活跃副作用加入目标字段的依赖集合。
   */
  track(target: object, key: PropertyKey): void {
    /* 获取或创建目标字段对应的依赖集合 */
    const dep = this.getOrCreateDep(target, key)

    trackEffect(dep)
  }

  /**
   * 触发指定字段的依赖集合，逐个执行对应副作用。
   */
  trigger(target: object, key: PropertyKey): void {
    /* 若当前字段未建立依赖集合，则无需继续 */
    const dep = this.findDep(target, key)

    if (!dep) {
      return
    }

    triggerEffects(dep)
  }

  /**
   * 确保目标字段具备依赖集合，不存在时创建新集合。
   */
  private getOrCreateDep(target: object, key: PropertyKey): DependencyBucket {
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

  /**
   * 读取已存在的依赖集合，不创建新条目。
   */
  private findDep(
    target: object,
    key: PropertyKey,
  ): DependencyBucket | undefined {
    return this.targetMap.get(target)?.get(key)
  }
}

const registry = new DepRegistry()

export function track(target: object, key: PropertyKey): void {
  registry.track(target, key)
}

export function trigger(target: object, key: PropertyKey): void {
  registry.trigger(target, key)
}
