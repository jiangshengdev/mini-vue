/**
 * LIS 可视化 - 播放控制器
 *
 * 封装自动播放的定时器逻辑，提供播放控制接口。
 *
 * @remarks
 * - 播放控制器负责管理自动播放的启停和速度调节。
 * - 内部使用 `setInterval` 实现定时步进，到达末尾时自动停止。
 * - 实现 `Disposable` 接口，确保组件卸载时清理定时器。
 * - 通过 `getNavigator` 获取导航器，确保输入变更后使用最新实例。
 */

import type { PlaybackController, PlaybackControllerDeps } from '../types.ts'

/**
 * 创建播放控制器，管理自动播放的生命周期。
 *
 * @remarks
 * - 依赖 `stateManager` 读写播放状态和速度。
 * - 依赖 `navigator` 执行步进操作。
 * - 每次步进后调用 `onStepUpdate` 通知外部刷新 UI。
 *
 * @param deps - 控制器依赖项
 * @returns 播放控制器实例
 */
export function createPlaybackController(deps: PlaybackControllerDeps): PlaybackController {
  const { stateManager, getNavigator, onStepUpdate } = deps
  const state = stateManager.getState()

  /** 自动播放定时器句柄，用于停止时清理。 */
  let playTimer: ReturnType<typeof setInterval> | undefined

  /**
   * 停止自动播放，清理定时器并更新播放状态。
   */
  const stop = (): void => {
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = undefined
    }

    state.isPlaying.set(false)
  }

  /**
   * 开始自动播放，按当前速度定时执行步进。
   *
   * @remarks
   * - 启动前会先停止现有定时器，避免重复启动。
   * - 每次步进成功后调用 `onStepUpdate` 刷新 UI。
   * - 到达最后一步时自动停止播放。
   */
  const start = (): void => {
    /* 先停止现有定时器，避免重复启动导致多个定时器并行。 */
    stop()
    state.isPlaying.set(true)

    playTimer = setInterval(() => {
      const result = getNavigator().next()

      if (result) {
        onStepUpdate()
      } else {
        /* 到达最后一步，自动停止播放。 */
        stop()
      }
    }, state.speed.get())
  }

  /**
   * 切换播放状态：正在播放则停止，否则开始播放。
   */
  const toggle = (): void => {
    if (state.isPlaying.get()) {
      stop()
    } else {
      start()
    }
  }

  /**
   * 更新播放速度，如果正在播放则重启定时器以应用新速度。
   *
   * @param newSpeed - 新的播放速度（毫秒）
   */
  const updateSpeed = (newSpeed: number): void => {
    state.speed.set(newSpeed)

    /* 如果正在播放，重新启动定时器以应用新速度。 */
    if (state.isPlaying.get()) {
      start()
    }
  }

  /**
   * 清理资源，停止定时器。
   */
  const dispose = (): void => {
    stop()
  }

  return {
    start,
    stop,
    toggle,
    updateSpeed,
    dispose,
  }
}
