import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_banned: boolean;
  is_suspended: boolean;
  accepted_terms: boolean;
  premium_expires_at: string | null;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  currentTool: string;
  setCurrentTool: (tool: string) => void;
  
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  showTermsPopup: boolean;
  setShowTermsPopup: (show: boolean) => void;
  
  currentModel: string;
  setCurrentModel: (model: string) => void;
  
  notifications: any[];
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  currentTool: 'python-ide',
  setCurrentTool: (tool) => set({ currentTool: tool }),
  
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  showTermsPopup: false,
  setShowTermsPopup: (show) => set({ showTermsPopup: show }),
  
  currentModel: 'gemini-1.5-flash',
  setCurrentModel: (model) => set({ currentModel: model }),
  
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: Date.now().toString() }],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
