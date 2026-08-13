import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, ShieldCheck, LogOut, LayoutDashboard, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const links = [
  { to: '/search', label: 'Find Helpers' },
  { to: '/jobs', label: 'Jobs' },
]

export function PublicLayout() {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const dashboardPath = user?.user_type === 'employer' ? '/employer' : user?.user_type === 'helper' ? '/helper' : '/admin'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Domestic Helper</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate(dashboardPath)}>
                  <LayoutDashboard /> Dashboard
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="cursor-pointer rounded-full outline-none ring-ring focus-visible:ring-2">
                      <Avatar className="size-9">
                        <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
                        <AvatarFallback name={user.name}>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{user.user_type}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(dashboardPath)}>Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(user.user_type === 'helper' ? '/helper/profile' : '/employer/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(dashboardPath + '/messages')}>Messages</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => logout().then(() => navigate('/'))}>
                      <LogOut /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => navigate('/register')}>
                  Create Profile
                </Button>
              </>
            )}
          </div>

          <button className="cursor-pointer rounded-md p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                  {l.label}
                </NavLink>
              ))}
              {user ? (
                <>
                  <NavLink to={dashboardPath} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                    Dashboard
                  </NavLink>
                  <button
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-accent cursor-pointer"
                    onClick={() => logout().then(() => navigate('/'))}
                  >
                    <LogOut className="size-4" /> Log out
                  </button>
                </>
              ) : (
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                    Log in
                  </Button>
                  <Button className="flex-1" onClick={() => navigate('/register')}>
                    <Briefcase /> Create Profile
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </span>
              <span className="font-semibold">Domestic Helper</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A verified trust network for domestic staff hiring in Nigeria. Safer hiring for families, fair reputation for good workers.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/search" className="hover:text-foreground">Find Helpers</Link></li>
              <li><Link to="/jobs" className="hover:text-foreground">Browse Jobs</Link></li>
              <li><Link to="/register" className="hover:text-foreground">Create Profile</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Trust &amp; Safety</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Identity Verification</li>
              <li>Verified Employment History</li>
              <li>Moderated Reviews</li>
              <li>Dispute Protection</li>
            </ul>
          </div>
        </div>
        <div className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Domestic Helper Trust Network. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
