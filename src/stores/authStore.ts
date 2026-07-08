import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import * as api from '@/lib/apiClient'

const TOKEN_KEY = 'kikuchat:user'

interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'error'
  error: string | null
  token: string | null
  login: (username: string, password: string, ad?: boolean) => Promise<void>
  register: (username: string, password: string, email: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

function setStoredToken(token: string | null) {
  if (token) {
    const payload = { token, timestamp: Date.now() }
    localStorage.setItem(TOKEN_KEY, JSON.stringify(payload))
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: 'idle',
      error: null,
      token: null,

      login: async (username: string, password: string, ad = false) => {
        set({ status: 'loading', error: null })
        try {
          const res = ad ? await api.loginAD({ username, password }) : await api.login({ username, password })
          setStoredToken(res.token)
          set({ user: res.user, token: res.token, status: 'idle' })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Login failed'
          set({ status: 'error', error: message })
          throw e
        }
      },

      register: async (username: string, password: string, email: string) => {
        set({ status: 'loading', error: null })
        try {
          await api.register({ username, password, email })
          // Auto-login after registration
          await get().login(username, password)
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Registration failed'
          set({ status: 'error', error: message })
          throw e
        }
      },

      logout: async () => {
        setStoredToken(null)
        set({ user: null, token: null, status: 'idle', error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: TOKEN_KEY,
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
