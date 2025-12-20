import { CounterDemo } from '../views/counter-demo.tsx'
import { Home } from '../views/home.tsx'
import { NotFound } from '../views/not-found.tsx'
import {
  AttributeBindings,
  BasicIndex,
  ConditionalsAndLoops,
  FormBindings,
  HandlingUserInput,
  HelloWorld,
  SimpleComponent,
} from '../views/basic'
import type { RouteRecord } from '@/index.ts'
import { createRouter } from '@/index.ts'

const routes: RouteRecord[] = [
  { path: '/', component: Home },
  { path: '/counter', component: CounterDemo },
  { path: '/basic', component: BasicIndex },
  { path: '/basic/hello-world', component: HelloWorld },
  { path: '/basic/handling-user-input', component: HandlingUserInput },
  { path: '/basic/attribute-bindings', component: AttributeBindings },
  { path: '/basic/conditionals-and-loops', component: ConditionalsAndLoops },
  { path: '/basic/form-bindings', component: FormBindings },
  { path: '/basic/simple-component', component: SimpleComponent },
]

export const router = createRouter({ routes, fallback: NotFound })
