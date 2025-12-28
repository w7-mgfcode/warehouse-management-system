import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Detect system dark mode preference
function getSystemPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Update document class for dark mode
function updateDocumentClass(darkMode: boolean) {
  if (typeof window === "undefined") return;
  if (darkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false, // Will be overridden by persisted value or system preference

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleDarkMode: () =>
        set((state) => {
          const newMode = !state.darkMode;
          updateDocumentClass(newMode);
          return { darkMode: newMode };
        }),

      setDarkMode: (enabled) => {
        updateDocumentClass(enabled);
        set({ darkMode: enabled });
      },
    }),
    {
      name: "wms-ui",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // On initial load, if no stored preference, use system preference
        if (state && state.darkMode === undefined) {
          const systemPref = getSystemPreference();
          state.setDarkMode(systemPref);
        } else if (state) {
          // Apply stored preference to document
          updateDocumentClass(state.darkMode);
        }
      },
    }
  )
);
