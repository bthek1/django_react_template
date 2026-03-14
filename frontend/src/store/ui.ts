import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  immer((set) => ({
    sidebarOpen: true,
    setSidebarOpen: (open) =>
      set((s) => {
        s.sidebarOpen = open
      }),
    toggleSidebar: () =>
      set((s) => {
        s.sidebarOpen = !s.sidebarOpen
      }),
  }))
)
