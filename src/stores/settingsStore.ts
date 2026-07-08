import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  language: string
  sidebarCollapsed: boolean
  setLanguage: (lang: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
  resetDefaults: () => void
}

const defaults = {
  language: 'en',
  sidebarCollapsed: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,

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
