/**
 * LIS 可视化 - 播放控制器
 *
 * 封装自动播放的定时器逻辑，提供播放控制接口
 */

import type { PlaybackController, PlaybackControllerDeps } from '../types.ts'

/**
 * 创建播放控制器
 *
 * @param deps - 控制器依赖
 * @returns 播放控制器实例
 */
export function createPlaybackController(deps: PlaybackControllerDeps): PlaybackController {
  const { stateManager, navigator, onStepUpdate } = deps
  const state = stateManager.getState()

  /** 自动播放定时器 */
  let playTimer: ReturnType<typeof setInterval> | undefined

  /**
   * 停止自动播放
   */
  const stop = (): void => {
    if (playTimer) {
      clearInterval(playTimer)
      playTimer = undefined
    }

    state.isPlaying.set(false)
  }

  /**
   * 开始自动播放
   */
  const start = (): void => {
    // 先停止现有定时器
    stop()
    state.isPlaying.set(true)

    playTimer = setInterval(() => {
      const result = navigator.next()

      if (result) {
        onStepUpdate()
      } else {
        // 到达最后一步，自动停止
        stop()
      }
    }, state.speed.get())
  }

  /**
   * 切换播放状态
   */
  const toggle = (): void => {
    if (state.isPlaying.get()) {
      stop()
    } else {
      start()
    }
  }

  /**
   * 更新播放速度
   *
   * 如果正在播放，会重启定时器以应用新速度
   *
   * @param newSpeed - 新的播放速度（毫秒）
   */
  const updateSpeed = (newSpeed: number): void => {
    state.speed.set(newSpeed)

    // 如果正在播放，重新启动以应用新速度
    if (state.isPlaying.get()) {
      start()
    }
  }

  /**
   * 清理资源
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
