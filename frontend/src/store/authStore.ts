import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  user_id: number;
  username: string;
  full_name: string | null;
  role: "admin" | "employee";
  access_token: string;
}

interface AuthStore {
  user: AuthUser | null;
  hydrated: boolean;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      isAuthenticated: () => !!get().user,
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "mail-ai-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
