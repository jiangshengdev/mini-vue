export const iterateKey = Symbol('mini-vue-iterate')

export const triggerOpTypes = {
  set: 'set',
  add: 'add',
  delete: 'delete',
} as const

export type TriggerOpType = (typeof triggerOpTypes)[keyof typeof triggerOpTypes]
