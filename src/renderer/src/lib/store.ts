import { create } from 'zustand'
import type {
  AppConfig,
  AppStateSnapshot,
  DeepPartial,
  RecordingMeta,
  ToastMessage
} from '../../../shared/types'

export type Page = 'record' | 'library' | 'settings' | 'about'

interface BuddyStore {
  config: AppConfig | null
  state: AppStateSnapshot | null
  recordings: RecordingMeta[]
  libraryLoading: boolean
  toasts: ToastMessage[]
  page: Page
  setConfig: (config: AppConfig) => void
  patchConfig: (patch: DeepPartial<AppConfig>) => Promise<void>
  setState: (state: AppStateSnapshot) => void
  setRecordings: (recordings: RecordingMeta[]) => void
  setLibraryLoading: (loading: boolean) => void
  setPage: (page: Page) => void
  pushToast: (toast: ToastMessage) => void
  dismissToast: (id: string) => void
}

export const useBuddy = create<BuddyStore>((set, get) => ({
  config: null,
  state: null,
  recordings: [],
  libraryLoading: true,
  toasts: [],
  page: 'record',

  setConfig: (config) => set({ config }),

  patchConfig: async (patch) => {
    const current = get().config
    if (current) set({ config: mergeConfig(current, patch) })
    const next = await window.buddy.config.set(patch)
    set({ config: next })
  },

  setState: (state) => set({ state }),
  setRecordings: (recordings) => set({ recordings, libraryLoading: false }),
  setLibraryLoading: (libraryLoading) => set({ libraryLoading }),
  setPage: (page) => set({ page }),
  pushToast: (toast) =>
    set((store) => ({ toasts: [...store.toasts.filter((t) => t.id !== toast.id), toast].slice(-4) })),
  dismissToast: (id) => set((store) => ({ toasts: store.toasts.filter((t) => t.id !== id) }))
}))

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeConfig(base: AppConfig, patch: DeepPartial<AppConfig>): AppConfig {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key]
    if (isObject(value) && isObject(current)) {
      out[key] = mergeConfig(current as unknown as AppConfig, value as DeepPartial<AppConfig>)
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out as unknown as AppConfig
}
