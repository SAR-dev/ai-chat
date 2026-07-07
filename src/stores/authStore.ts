import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import * as api from '@/lib/apiClient'

interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'error'
  error: string | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: 'idle',
      error: null,
      token: null,

      login: async (email: string, password: string) => {
        set({ status: 'loading', error: null })
        try {
          const res = await api.login({ email, password })
          localStorage.setItem('auth-token', res.token)
          set({ user: res.user, token: res.token, status: 'idle' })
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Login failed'
          set({ status: 'error', error: message })
          throw e
        }
      },

      logout: async () => {
        try {
          await api.logout()
        } catch {
          // ignore
        }
        localStorage.removeItem('auth-token')
        set({ user: null, token: null, status: 'idle', error: null })
      },

      restoreSession: async () => {
        const token = get().token
        if (!token) return
        set({ status: 'loading' })
        try {
          const res = await api.getMe()
          set({ user: res.user, status: 'idle' })
        } catch {
          localStorage.removeItem('auth-token')
          set({ user: null, token: null, status: 'idle', error: null })
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ token: state.token }),
    },
  ),
)
