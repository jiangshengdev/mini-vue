import { h } from '@/jsx-runtime'

const flag: boolean = Math.random() > 0.5

// 期望：允许布尔短路语法传递子节点。
// 修复后：children rest 参数复用了 ComponentChildren，可通过类型检查。
h('div', undefined, flag && h('span', undefined, 'child'))
