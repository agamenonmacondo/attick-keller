'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isHost: boolean
  isEmployee: boolean
  roles: string[]
  area: string | null
  adminRole: string | null
  roleLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

const ROLE_HIERARCHY = ['super_admin', 'store_admin', 'host', 'lider_area', 'colaborador', 'reservante']

function primaryRole(roles: string[]): string | null {
  for (const r of ROLE_HIERARCHY) {
    if (roles.includes(r)) return r
  }
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<string[]>([])
  const [area, setArea] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchRole = useCallback(async () => {
    setRoleLoading(true)
    try {
      const res = await fetch('/api/auth/role')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles || [])
        setArea(data.area || null)
      } else {
        setRoles([])
        setArea(null)
      }
    } catch {
      setRoles([])
      setArea(null)
    } finally {
      setRoleLoading(false)
    }
  }, [])

  const clearRole = useCallback(() => {
    setRoles([])
    setArea(null)
    setRoleLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        fetchRole()
      } else {
        clearRole()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      if (session?.user) {
        fetchRole()
      } else {
        clearRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchRole, clearRole])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone },
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (error) return { error: error.message }

    if (data.session) return { error: null }

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      })
      if (res.ok) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInError) return { error: null }
      }
      await new Promise(r => setTimeout(r, 2000))
      const res2 = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: fullName }),
      })
      if (res2.ok) {
        const { error: signInError2 } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInError2) return { error: null }
      }
    } catch {
      // Auto-confirm failed
    }

    return { error: null }
  }

  const signInWithGoogle = async () => {
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin + '/auth/callback' },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    clearRole()
    window.location.href = '/'
  }

  // Derived booleans (backward compatible)
  const isAdmin = roles.includes('super_admin') || roles.includes('store_admin') || roles.includes('lider_area') || roles.includes('host')
  const isHost = roles.includes('host')
  const isEmployee = roles.includes('lider_area') || roles.includes('colaborador') || roles.includes('reservante')

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isHost, isEmployee, roles, area, adminRole: primaryRole(roles), roleLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
