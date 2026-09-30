import { contextBridge, ipcRenderer } from 'electron'
import type { BuddyApi, OverlayState, RecorderCommand, SystemInfo, Unsubscribe } from '../shared/api'
import type {
  AppConfig,
  AppStateSnapshot,
  RecordingMeta,
  RecordingSavedPayload,
  SaveAudioPayload,
  SetupProgress,
  ShortcutBinding,
  ToastMessage,
  TranscriptUpdate,
  TranscribeResult,
  TranscriptionCheck
} from '../shared/types'

function subscribe<T>(channel: string, cb: (value: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, value: T): void => cb(value)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: BuddyApi = {
  config: {
    get: () => ipcRenderer.invoke('config:get') as Promise<AppConfig>,
    set: (patch) => ipcRenderer.invoke('config:set', patch) as Promise<AppConfig>,
    reset: () => ipcRenderer.invoke('config:reset') as Promise<AppConfig>,
    onChanged: (cb) => subscribe<AppConfig>('config:changed', cb)
  },
  shortcut: {
    beginCapture: () => ipcRenderer.invoke('shortcut:begin-capture') as Promise<void>,
    cancelCapture: () => ipcRenderer.invoke('shortcut:cancel-capture') as Promise<void>,
    onCaptured: (cb) => subscribe<ShortcutBinding>('shortcut:captured', cb),
    onDown: (cb) => subscribe<void>('shortcut:down', cb),
    onUp: (cb) => subscribe<void>('shortcut:up', cb)
  },
  recorder: {
    save: (payload: SaveAudioPayload) =>
      ipcRenderer.invoke('recorder:save', payload) as Promise<RecordingMeta | null>,
    reportLevel: (level: number) => ipcRenderer.send('recorder:level', level),
    notifyStart: (deviceLabel?: string) => ipcRenderer.send('recorder:started', deviceLabel),
    notifyStop: () => ipcRenderer.send('recorder:stopped'),
    onCommand: (cb) => subscribe<RecorderCommand>('recorder:command', cb)
  },
  library: {
    list: () => ipcRenderer.invoke('library:list') as Promise<RecordingMeta[]>,
    transcribe: (path: string) =>
      ipcRenderer.invoke('library:transcribe', path) as Promise<TranscribeResult>,
    remove: (path: string) => ipcRenderer.invoke('library:remove', path) as Promise<void>,
    reveal: (path: string) => ipcRenderer.invoke('library:reveal', path) as Promise<void>,
    open: (path: string) => ipcRenderer.invoke('library:open', path) as Promise<void>,
    onChanged: (cb) => subscribe<void>('library:changed', cb),
    onTranscript: (cb) => subscribe<TranscriptUpdate>('transcript:update', cb),
    onSaved: (cb) => subscribe<RecordingSavedPayload>('recording:saved', cb)
  },
  transcription: {
    check: () => ipcRenderer.invoke('transcription:check') as Promise<TranscriptionCheck>,
    setup: () => ipcRenderer.invoke('transcription:setup') as Promise<TranscriptionCheck>,
    cancelSetup: () => ipcRenderer.invoke('transcription:cancel-setup') as Promise<void>,
    onSetupProgress: (cb) => subscribe<SetupProgress>('transcription:setup-progress', cb)
  },
  clipboard: {
    write: (text: string) => ipcRenderer.invoke('clipboard:write', text) as Promise<void>
  },
  paste: {
    perform: () => ipcRenderer.invoke('paste:perform') as Promise<void>
  },
  system: {
    info: () => ipcRenderer.invoke('system:info') as Promise<SystemInfo>,
    openFolder: (dir?: string) => ipcRenderer.invoke('system:open-folder', dir) as Promise<void>,
    chooseFolder: () => ipcRenderer.invoke('system:choose-folder') as Promise<string | null>,
    openAccessibilitySettings: () =>
      ipcRenderer.invoke('system:open-accessibility') as Promise<void>
  },
  window: {
    hide: () => ipcRenderer.invoke('window:hide') as Promise<void>,
    minimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
    show: () => ipcRenderer.invoke('window:show') as Promise<void>,
    setOverlayEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('window:set-overlay-enabled', enabled) as Promise<void>,
    setOverlayPosition: (position: 'top' | 'bottom') =>
      ipcRenderer.invoke('window:set-overlay-position', position) as Promise<void>
  },
  app: {
    quit: () => ipcRenderer.invoke('app:quit') as Promise<void>,
    relaunch: () => ipcRenderer.invoke('app:relaunch') as Promise<void>
  },
  events: {
    getState: () => ipcRenderer.invoke('state:get') as Promise<AppStateSnapshot>,
    onState: (cb) => subscribe<AppStateSnapshot>('state', cb),
    onToast: (cb) => subscribe<ToastMessage>('toast', cb),
    onOverlayState: (cb) => subscribe<OverlayState>('overlay:state', cb),
    onLibraryChanged: (cb) => subscribe<void>('library:changed', cb),
    onNavigate: (cb) => subscribe<string>('navigate', cb)
  }
}

contextBridge.exposeInMainWorld('buddy', api)
