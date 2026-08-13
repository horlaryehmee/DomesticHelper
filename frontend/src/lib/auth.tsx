import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'

export interface AuthUser {
  id: number
  uuid: string
  name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  phone_verified: boolean
  email_verified: boolean
  user_type: 'employer' | 'helper' | 'admin'
  avatar_url: string | null
  profile_completion: number
  roles?: string[]
  employer_profile?: {
    profile_type: 'individual' | 'agency'
    agency_name: string | null
    city: string | null
    state: string | null
    bio: string | null
    profile_completed: boolean
  } | null
  helper_profile?: {
    photo_url: string | null
    city: string | null
    state: string | null
    nin_last4: string | null
    verification_status: string | null
    is_public: boolean
    profile_completed: boolean
  } | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (credentials: { login: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get<{ user: AuthUser }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials: { login: string; password: string }) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', credentials)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // token may already be invalid — clear locally regardless
    }
    setToken(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
