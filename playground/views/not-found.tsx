import type { SetupComponent } from '@/index.ts'

export const NotFound: SetupComponent = () => {
  return () => {
    return (
      <div>
        <h2>404</h2>
        <p>页面不存在</p>
      </div>
    )
  }
}
