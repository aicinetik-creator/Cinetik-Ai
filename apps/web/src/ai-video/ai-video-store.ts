import { create } from "zustand";

interface AiVideoStore {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	toggle: () => void;
}

export const useAiVideoStore = create<AiVideoStore>()((set) => ({
	isOpen: false,
	open: () => set({ isOpen: true }),
	close: () => set({ isOpen: false }),
	toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));
