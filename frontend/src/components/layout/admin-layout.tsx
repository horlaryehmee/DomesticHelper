import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, Users, UserCheck, FileText, Star, ClipboardCheck,
  Briefcase, CreditCard, Gauge, ScrollText, Settings, LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/verifications', label: 'Verifications', icon: UserCheck },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/disputes', label: 'Disputes', icon: ClipboardCheck },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/trust-scores', label: 'Trust Scores', icon: Gauge },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const content = (
    <>
      <div className="px-4 py-5">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">Domestic Helper</div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Admin</div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3">
        <button
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          onClick={() => logout().then(() => navigate('/'))}
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background shadow-xl">{content}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <button className="cursor-pointer rounded-md p-2 hover:bg-accent" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-semibold">Admin</span>
          </Link>
        </header>
        <main className="flex-1 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
