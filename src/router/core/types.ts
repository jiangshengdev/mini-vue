import type { Ref } from '@/reactivity/index.ts'
import type { SetupComponent } from '@/jsx-foundation/types.ts'

export interface RouteRecord {
  path: string
  component: SetupComponent
}

export interface RouteLocation {
  path: string
  component: SetupComponent
}

export interface RouterConfig {
  routes: RouteRecord[]
  fallback: SetupComponent
}

export interface Router {
  currentRoute: Ref<RouteLocation>
  navigate: (path: string) => void
  start: () => void
  stop: () => void
}
