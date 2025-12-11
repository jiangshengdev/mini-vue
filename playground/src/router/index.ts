import { CounterView } from '../views/counter-view.tsx'
import { HomeView } from '../views/home-view.tsx'
import { NotFoundView } from '../views/not-found-view.tsx'
import type { RouteRecord } from '@/index.ts'
import { createRouter } from '@/index.ts'

const routes: RouteRecord[] = [
  { path: '/', component: HomeView },
  { path: '/counter', component: CounterView },
]

export const router = createRouter({ routes, fallback: NotFoundView })
