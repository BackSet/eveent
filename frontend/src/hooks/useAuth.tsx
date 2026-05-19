import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AuthState } from '../types'
import api from '../services/api'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (nombre: string, email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (role: string) => boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadState(): AuthState {
  const token = localStorage.getItem('token')
  const raw = localStorage.getItem('user')
  if (token && raw) {
    const user = JSON.parse(raw)
    return { token, email: user.email, nombre: user.nombre, roles: user.roles ?? [] }
  }
  return { token: null, email: null, nombre: null, roles: [] }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState)

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password })
    const auth: AuthState = { token: data.token, email: data.email, nombre: data.nombre, roles: data.roles }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ email: data.email, nombre: data.nombre, roles: data.roles }))
    setState(auth)
  }, [])

  const register = useCallback(async (nombre: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { nombre, email, password })
    const auth: AuthState = { token: data.token, email: data.email, nombre: data.nombre, roles: data.roles }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify({ email: data.email, nombre: data.nombre, roles: data.roles }))
    setState(auth)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setState({ token: null, email: null, nombre: null, roles: [] })
  }, [])

  const hasRole = (role: string) => state.roles.includes(role)

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, hasRole, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
