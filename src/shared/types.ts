export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export type ThemeMode = 'light' | 'dark' | 'system'

export type AccentName =
  | 'pink'
  | 'rose'
  | 'magenta'
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'sky'

export type AudioFormat = 'wav' | 'mp3'

export type TranscriptionProvider = 'none' | 'local' | 'openai'

export type PasteAction = 'clipboard' | 'paste' | 'both' | 'none'

export type TriggerMode = 'hold' | 'toggle'

export interface ShortcutBinding {
  /** uiohook keycode, or null for the built-in fallback accelerator */
  keycode: number | null
  /** Human readable label, e.g. "Right Option" or "Ctrl + Space" */
  label: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export interface OpenAISettings {
  apiKey: string
  baseUrl: string
  model: string
}

export interface TranscriptionSettings {
  provider: TranscriptionProvider
  localModel: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3'
  pythonPath: string
  autoSetup: boolean
  openai: OpenAISettings
  language: string
}

export interface AppConfig {
  theme: ThemeMode
  accent: AccentName
  animations: boolean
  sidebarCollapsed: boolean

  shortcut: ShortcutBinding
  triggerMode: TriggerMode

  inputDeviceId: string | null
  inputDeviceLabel: string | null

  outputDir: string
  format: AudioFormat
  filenamePattern: string

  minDurationMs: number
  silenceThreshold: number
  maxDurationSec: number

  autoTranscribe: boolean
  transcription: TranscriptionSettings

  afterTranscribe: PasteAction
  pasteDelayMs: number

  hook: string

  showOverlay: boolean
  overlayPosition: 'top' | 'bottom'
  playSounds: boolean
  launchAtLogin: boolean
  minimizeToTray: boolean
  saveToLibrary: boolean

  maxLibraryItems: number
}

export interface RecordingMeta {
  id: string
  name: string
  path: string
  format: AudioFormat
  sizeBytes: number
  durationMs: number
  createdAt: number
  transcript: string | null
  transcriptStatus: 'none' | 'pending' | 'done' | 'error'
}

export interface RecordingSavedPayload {
  meta: RecordingMeta
}

export interface TranscriptUpdate {
  id: string
  path: string
  text: string | null
  status: RecordingMeta['transcriptStatus']
  error?: string
}

export interface AppStateSnapshot {
  recording: boolean
  startedAt: number | null
  elapsedMs: number
  level: number
  peak: number
  deviceLabel: string | null
  lastSaved: RecordingMeta | null
  transcriberRunning: boolean
  queueDepth: number
  shortcutLabel: string
  mode: TriggerMode
  shortcutFallback: boolean
}

export interface DeviceOption {
  deviceId: string
  label: string
  isDefault: boolean
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface ToastMessage {
  id: string
  kind: ToastKind
  title: string
  body?: string
  at: number
}

/** Payload sent from the renderer to the main process when a recording ends. */
export type SaveAudioPayload =
  | {
      kind: 'pcm'
      /** mono int16 little-endian samples */
      pcm: ArrayBuffer
      sampleRate: number
      durationMs: number
      /** peak amplitude on the int16 scale (0..32767) */
      peak: number
      deviceLabel: string | null
    }
  | {
      kind: 'encoded'
      format: AudioFormat
      bytes: ArrayBuffer
      sampleRate: number
      durationMs: number
      peak: number
      deviceLabel: string | null
    }

export interface TranscribeResult {
  text: string | null
  error?: string
}

export interface TranscriptionCheck {
  ok: boolean
  python: string
  backend: 'faster-whisper' | 'openai-whisper' | null
  error?: string
}

export interface SetupProgress {
  phase: 'prepare' | 'uv' | 'venv' | 'install' | 'verify' | 'model' | 'done' | 'error'
  message: string
  percent: number
}

export interface ShortcutCaptureResult {
  binding: ShortcutBinding | null
  cancelled: boolean
}
