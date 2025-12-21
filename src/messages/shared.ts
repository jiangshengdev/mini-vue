/**
 * `runWithChannel` 不支持 `Promise`/thenable 返回值的错误提示，提醒调用方保持同步。
 */
export const sharedRunnerNoPromise =
  'runWithChannel: runner 不支持 Promise 或 thenable 返回值，请使用同步函数'
