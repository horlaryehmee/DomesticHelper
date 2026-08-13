import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, LayoutDashboard, User, Heart, Briefcase, Users, CalendarClock,
  FileText, Star, MessageSquare, Bell, Settings, LogOut, Menu, ClipboardCheck, Search,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const base = user?.user_type === 'employer' ? '/employer' : '/helper'

  const nav = [
    { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
    ...(user?.user_type === 'employer'
      ? [
          { to: `${base}/saved-helpers`, label: 'Saved Helpers', icon: Heart },
          { to: `${base}/verification-reports`, label: 'Verification Reports', icon: ClipboardCheck },
        ]
      : [
          { to: `${base}/verification`, label: 'Verification', icon: ShieldCheck },
          { to: `${base}/disputes`, label: 'Disputes', icon: ClipboardCheck },
        ]),
    { to: '/search', label: 'Find Helpers', icon: Search },
    { to: '/jobs', label: 'Jobs', icon: Briefcase },
    { to: `${base}/applications`, label: 'Applications', icon: FileText },
    { to: `${base}/interviews`, label: 'Interviews', icon: CalendarClock },
    { to: `${base}/employments`, label: 'Employment', icon: Users },
    { to: `${base}/reviews`, label: 'Reviews', icon: Star },
    { to: `${base}/reports`, label: 'Reports', icon: FileText },
    { to: `${base}/messages`, label: 'Messages', icon: MessageSquare },
    { to: `${base}/notifications`, label: 'Notifications', icon: Bell },
    { to: `${base}/profile`, label: 'Profile', icon: User },
    { to: `${base}/settings`, label: 'Settings', icon: Settings },
  ]

  const content = (
    <>
      <div className="px-4 py-5">
        <Link to={base} className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <span className="font-semibold">Domestic Helper</span>
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
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-9">
            <AvatarImage src={user?.avatar_url ?? user?.helper_profile?.photo_url ?? undefined} alt={user?.name} />
            <AvatarFallback name={user?.name}>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs capitalize text-muted-foreground">{user?.user_type}</div>
          </div>
          <button
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => logout().then(() => navigate('/'))}
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background md:flex">{content}</aside>

      {/* Mobile drawer */}
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
          <Link to={base} className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <span className="font-semibold">Domestic Helper</span>
          </Link>
        </header>
        <main className="flex-1 bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
