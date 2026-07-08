import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  temperature: number
  language: string
  sidebarCollapsed: boolean
  setTemperature: (value: number) => void
  setLanguage: (lang: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  resetDefaults: () => void
}

const defaults = {
  temperature: 0.7,
  language: 'en',
  sidebarCollapsed: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

      setTemperature: (temperature: number) => set({ temperature }),
      setLanguage: (language: string) => set({ language }),
      setSidebarCollapsed: (sidebarCollapsed: boolean) => set({ sidebarCollapsed }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      resetDefaults: () => set(defaults),
    }),
    {
      name: 'settings-store',
    },
  ),
)
