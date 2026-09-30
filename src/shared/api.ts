import type {
  AppConfig,
  AppStateSnapshot,
  DeepPartial,
  RecordingMeta,
  SetupProgress,
  TranscriptionCheck,
  RecordingSavedPayload,
  SaveAudioPayload,
  ShortcutBinding,
  ToastMessage,
  TranscriptUpdate,
  TranscribeResult
} from './types'

export type Unsubscribe = () => void

export interface RecorderCommand {
  type: 'start' | 'stop'
}

export interface OverlayState {
  visible: boolean
  recording: boolean
  elapsedMs: number
  level: number
  peak: number
  hint: string
  deviceLabel: string | null
}

export interface SystemInfo {
  version: string
  platform: string
  accessibilityTrusted: boolean
  usingFallbackShortcut: boolean
}

export interface BuddyApi {
  config: {
    get: () => Promise<AppConfig>
    set: (patch: DeepPartial<AppConfig>) => Promise<AppConfig>
    reset: () => Promise<AppConfig>
    onChanged: (cb: (cfg: AppConfig) => void) => Unsubscribe
  }
  shortcut: {
    beginCapture: () => Promise<void>
    cancelCapture: () => Promise<void>
    onCaptured: (cb: (binding: ShortcutBinding) => void) => Unsubscribe
    onDown: (cb: () => void) => Unsubscribe
    onUp: (cb: () => void) => Unsubscribe
  }
  recorder: {
    save: (payload: SaveAudioPayload) => Promise<RecordingMeta | null>
    reportLevel: (level: number) => void
    notifyStart: (deviceLabel?: string) => void
    notifyStop: () => void
    onCommand: (cb: (command: RecorderCommand) => void) => Unsubscribe
  }
  library: {
    list: () => Promise<RecordingMeta[]>
    transcribe: (path: string) => Promise<TranscribeResult>
    remove: (path: string) => Promise<void>
    reveal: (path: string) => Promise<void>
    open: (path: string) => Promise<void>
    onChanged: (cb: () => void) => Unsubscribe
    onTranscript: (cb: (update: TranscriptUpdate) => void) => Unsubscribe
    onSaved: (cb: (payload: RecordingSavedPayload) => void) => Unsubscribe
  }
  transcription: {
    check: () => Promise<TranscriptionCheck>
    setup: () => Promise<TranscriptionCheck>
    cancelSetup: () => Promise<void>
    onSetupProgress: (cb: (progress: SetupProgress) => void) => Unsubscribe
  }
  clipboard: {
    write: (text: string) => Promise<void>
  }
  paste: {
    perform: () => Promise<void>
  }
  system: {
    info: () => Promise<SystemInfo>
    openFolder: (dir?: string) => Promise<void>
    chooseFolder: () => Promise<string | null>
    openAccessibilitySettings: () => Promise<void>
  }
  window: {
    hide: () => Promise<void>
    minimize: () => Promise<void>
    show: () => Promise<void>
    setOverlayEnabled: (enabled: boolean) => Promise<void>
    setOverlayPosition: (position: 'top' | 'bottom') => Promise<void>
  }
  app: {
    quit: () => Promise<void>
    relaunch: () => Promise<void>
  }
  events: {
    getState: () => Promise<AppStateSnapshot>
    onState: (cb: (state: AppStateSnapshot) => void) => Unsubscribe
    onToast: (cb: (toast: ToastMessage) => void) => Unsubscribe
    onOverlayState: (cb: (state: OverlayState) => void) => Unsubscribe
    onLibraryChanged: (cb: () => void) => Unsubscribe
    onNavigate: (cb: (page: string) => void) => Unsubscribe
  }
}

declare global {
  interface Window {
    buddy: BuddyApi
  }
}
