import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'

// Routes that should use full-width layout (no container)
const FULL_WIDTH_ROUTES = ['/diagrams/']

export function Layout() {
  const location = useLocation()
  const isFullWidth = FULL_WIDTH_ROUTES.some((route) =>
    location.pathname.includes(route)
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={isFullWidth ? '' : 'container mx-auto py-6 px-4'}>
        <Outlet />
      </main>
    </div>
  )
}
