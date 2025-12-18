/**
 * `runWithChannel` 不支持 Promise/thenable 返回值的错误提示，提醒调用方保持同步。
 */
export const sharedRunnerNoPromise =
  'runWithChannel: runner does not support Promise or thenable return value'
