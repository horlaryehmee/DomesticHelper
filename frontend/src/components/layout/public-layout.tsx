import { useFeatures } from '@/lib/features'
import { useState } from 'react'
import { FeatureLink as Link } from '@/components/feature-link'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, LayoutDashboard, Briefcase } from 'lucide-react'
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
import { LogoLockup } from '@/components/logo'

const links = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Find Helpers' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/community', label: 'Community Stories' },
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
]

export function PublicLayout() {
  const { canVisit } = useFeatures()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  const dashboardPath = user?.user_type === 'employer' ? '/employer' : user?.user_type === 'helper' ? '/helper' : '/admin'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Hire Safe home">
            <LogoLockup className="h-9" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
            {links.filter(l => canVisit(l.to)).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  cn('rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
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
                    <DropdownMenuItem hidden={!canVisit(user.user_type === 'helper' ? '/helper/profile' : '/employer/profile')} onClick={() => navigate(user.user_type === 'helper' ? '/helper/profile' : '/employer/profile')}>Profile</DropdownMenuItem>
                    {canVisit(dashboardPath + '/messages') && <DropdownMenuItem onClick={() => navigate(dashboardPath + '/messages')}>Messages</DropdownMenuItem>}
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

          <button className="cursor-pointer rounded-md p-2 xl:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {mobileOpen && (
          <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t px-4 py-3 xl:hidden">
            <div className="flex flex-col gap-1">
              {links.filter(l => canVisit(l.to)).map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent')}>
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
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <LogoLockup className="h-12" />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A clearer foundation for domestic work in Nigeria. Private verification details, two guarantors and a considered account review.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {canVisit('/') && <li><Link to="/" className="hover:text-foreground">Home</Link></li>}
              {canVisit('/search') && <li><Link to="/search" className="hover:text-foreground">Find Helpers</Link></li>}
              {canVisit('/jobs') && <li><Link to="/jobs" className="hover:text-foreground">Browse Jobs</Link></li>}
              {canVisit('/community') && <li><Link to="/community" className="hover:text-foreground">Community Stories</Link></li>}
              {canVisit('/register') && <li><Link to="/register" className="hover:text-foreground">Create Profile</Link></li>}
              {canVisit('/login') && <li><Link to="/login" className="hover:text-foreground">Log in</Link></li>}
              {canVisit('/about') && <li><Link to="/about" className="hover:text-foreground">About us</Link></li>}
              {canVisit('/how-it-works') && <li><Link to="/how-it-works" className="hover:text-foreground">How it works</Link></li>}
              {canVisit('/contact') && <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold">Trust &amp; Safety</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {canVisit('/safety') && <li><Link to="/safety" className="hover:text-foreground">Safety</Link></li>}
              {canVisit('/faq') && <li><Link to="/faq" className="hover:text-foreground">FAQs</Link></li>}
              {canVisit('/privacy') && <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>}
              {canVisit('/terms') && <li><Link to="/terms" className="hover:text-foreground">Terms and Conditions</Link></li>}
              {canVisit('/cookies') && <li><Link to="/cookies" className="hover:text-foreground">Cookie Notice</Link></li>}
            </ul>
          </div>
        </div>
        <div className="border-t py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Hire Safe Trust Network. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
