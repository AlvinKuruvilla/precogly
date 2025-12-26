import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, User, Settings, LogOut, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Threat Models', href: '/threat-models' },
  { name: 'Frameworks', href: '/frameworks' },
  { name: 'Tech Components', href: '/tech-components' },
  { name: 'Threat Libraries', href: '/threat-libraries' },
]

// Routes where we show minimal navbar (just logo + user menu)
const minimalNavRoutes = [
  /^\/threat-models\/[^/]+$/, // /threat-models/:id (but not /threat-models)
  /^\/threat-models\/[^/]+\/diagrams/, // /threat-models/:id/diagrams/:diagramId
]

export function Navbar() {
  const location = useLocation()

  // Check if we should show minimal nav
  const isMinimalNav = minimalNavRoutes.some((pattern) =>
    pattern.test(location.pathname)
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className={cn('flex items-center px-4', isMinimalNav ? 'h-11' : 'h-14')}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/precogly-logo.png"
            alt="Precogly"
            className={cn(isMinimalNav ? 'h-6 w-6' : 'h-8 w-8')}
          />
          <span className={cn('font-semibold', isMinimalNav ? 'text-base' : 'text-lg')}>
            Precogly
          </span>
        </Link>

        {/* Navigation Links - only show in full mode */}
        {!isMinimalNav && (
          <nav className="flex items-center gap-1 ml-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  location.pathname === item.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick nav dropdown - only in minimal mode */}
        {isMinimalNav && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Navigate</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link to={item.href}>{item.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn('flex items-center gap-2', isMinimalNav && 'h-8 px-2')}
            >
              <Avatar className={cn(isMinimalNav ? 'h-6 w-6' : 'h-8 w-8')}>
                <AvatarFallback className={cn(isMinimalNav && 'text-xs')}>JD</AvatarFallback>
              </Avatar>
              {!isMinimalNav && (
                <>
                  <span className="text-sm font-medium">John Doe</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
