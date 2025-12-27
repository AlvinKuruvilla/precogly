import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  getCurrentUser,
  isAuthenticated,
  clearTokens,
  type LoginCredentials,
  type RegisterInput,
} from '@/lib/api'

interface User {
  pk: number
  email: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    async function checkAuth() {
      if (isAuthenticated()) {
        try {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
        } catch {
          // Token expired or invalid
          clearTokens()
        }
      }
      setIsLoading(false)
    }
    checkAuth()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await apiLogin(credentials)
    setUser(response.user)
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const response = await apiRegister(input)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
