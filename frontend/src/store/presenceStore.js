import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePresenceStore = create(
  persist(
    (set) => ({
      onlineUsers: [],
      lastUpdated: null,
      isStale: false,
      setOnlineUsers: (users) =>
        set({ onlineUsers: users, lastUpdated: new Date().toISOString(), isStale: false }),
      markStale: () => set({ isStale: true }),
    }),
    {
      name: 'rahhal-presence',
      partialize: (state) => ({
        onlineUsers: state.onlineUsers,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
