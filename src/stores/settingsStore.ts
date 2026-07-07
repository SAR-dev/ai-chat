import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  temperature: number
  theme: 'light' | 'dark' | 'system'
  language: string
  setTemperature: (value: number) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: string) => void
  resetDefaults: () => void
}

const defaults = {
  temperature: 0.7,
  theme: 'system' as const,
  language: 'en',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setTemperature: (temperature: number) => set({ temperature }),
      setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),
      setLanguage: (language: string) => set({ language }),
      resetDefaults: () => set(defaults),
    }),
    {
      name: 'settings-store',
    },
  ),
)
