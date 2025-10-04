'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { trpc } from '@/lib/trpc-client'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { data: meData, error: meError, isLoading: meLoading } = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (meData?.user) {
      setUser(meData.user)
      setIsLoading(false)
    } else if (token && meError && !meLoading) {
      // Token exists but user data failed to load (and we're not loading)
      logout()
      setIsLoading(false)
    }
  }, [meData, meError, meLoading, token])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
