import { CounterView } from '../views/counter-view.tsx'
import { HomeView } from '../views/home-view.tsx'
import { NotFoundView } from '../views/not-found-view.tsx'
import {
  AttributeBindingsView,
  BasicIndexView,
  ConditionalsAndLoopsView,
  FormBindingsView,
  HandlingUserInputView,
  HelloWorldView,
  SimpleComponentView,
} from '../views/basic/index.ts'
import type { RouteRecord } from '@/index.ts'
import { createRouter } from '@/index.ts'

const routes: RouteRecord[] = [
  { path: '/', component: HomeView },
  { path: '/counter', component: CounterView },
  { path: '/basic', component: BasicIndexView },
  { path: '/basic/hello-world', component: HelloWorldView },
  { path: '/basic/handling-user-input', component: HandlingUserInputView },
  { path: '/basic/attribute-bindings', component: AttributeBindingsView },
  { path: '/basic/conditionals-and-loops', component: ConditionalsAndLoopsView },
  { path: '/basic/form-bindings', component: FormBindingsView },
  { path: '/basic/simple-component', component: SimpleComponentView },
]

export const router = createRouter({ routes, fallback: NotFoundView })
