import {
  BrowserWindow,
  Menu,
  app,
  clipboard,
  dialog,
  ipcMain,
  shell,
  systemPreferences
} from 'electron'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { OverlayState, SystemInfo } from '../shared/api'
import type {
  AppConfig,
  AppStateSnapshot,
  DeepPartial,
  RecordingMeta,
  SaveAudioPayload,
  ShortcutBinding,
  ToastMessage,
  ToastKind,
  TranscriptionCheck
} from '../shared/types'
import { loadConfig, resetConfig, saveConfig } from './config'
import { deleteRecording, ensureDir, listRecordings, writeRecording } from './audioFile'
import { deliverText } from './paste'
import { ShortcutManager } from './shortcuts'
import { BuddyTray } from './tray'
import { checkBackend, TranscriptionQueue, transcribeFile } from './transcription'
import { cancelSetup, setupLocalBackend } from './provisioner'
import { createMainWindow, createOverlayWindow, positionOverlay } from './windows'

const SESSION_PASTE = new Set<string>()

export class BuddyApp {
  private cfg: AppConfig
  private main: BrowserWindow | null = null
  private overlay: BrowserWindow | null = null
  private tray: BuddyTray | null = null
  private transcription: TranscriptionQueue
  private shortcuts: ShortcutManager

  private recording = false
  private startedAt: number | null = null
  private level = 0
  private peak = 0
  private deviceLabel: string | null = null
  private lastSaved: RecordingMeta | null = null
  private overlayTimer: NodeJS.Timeout | null = null

  private quitting = false
  private fallbackLabel: string | null = null
  private backendSetupPromise: Promise<TranscriptionCheck> | null = null
  private autoSetupStarted = false

  constructor() {
    this.cfg = loadConfig()
    this.transcription = new TranscriptionQueue(() => this.cfg)
    this.shortcuts = new ShortcutManager((binding, persist) => this.applyShortcut(binding, persist))
  }

  getMainWindow(): BrowserWindow | null {
    return this.main
  }

  getOverlayWindow(): BrowserWindow | null {
    return this.overlay
  }

  start(): void {
    this.ensureShortcut()
    this.main = createMainWindow()
    this.attachWindowBehavior(this.main)
    this.overlay = createOverlayWindow(this.cfg)
    this.registerIpc()
    this.buildMenu()

    this.shortcuts.on('down', () => this.onTriggerDown())
    this.shortcuts.on('up', () => this.onTriggerUp())
    this.shortcuts.on('captured', (binding) => {
      this.applyShortcut(binding, true)
      this.send('shortcut:captured', binding)
    })
    this.shortcuts.start()
    this.shortcuts.setBinding(this.cfg.shortcut)

    // If the global hook is live but no real key is stored (e.g. a stale fallback
    // binding from a session without Accessibility), assign the platform default.
    if (!this.shortcuts.usingFallback && this.cfg.shortcut.keycode === null) {
      this.cfg = saveConfig({ shortcut: this.defaultBinding() })
      this.shortcuts.setBinding(this.cfg.shortcut)
    }

    this.transcription.on('update', (path, text, error) => {
      this.broadcast('transcript:update', { id: path, path, text, status: error && !text ? 'error' : text ? 'done' : 'none', error })
      this.emitLibraryChanged()
      if (text && SESSION_PASTE.has(path)) {
        void deliverText(text, this.cfg)
      } else if (error && SESSION_PASTE.has(path)) {
        this.toast('warning', 'Transcription unavailable', error)
      }
      this.emitState()
    })

    this.tray = new BuddyTray({
      onToggleRecord: () => (this.recording ? this.stopRecording() : this.startRecording()),
      onShow: () => this.showMain(),
      onOpenFolder: () => void shell.openPath(this.cfg.outputDir),
      onSettings: () => {
        this.showMain()
        this.send('navigate', 'settings')
      },
      onQuit: () => this.quit()
    })
    this.tray.create(this.activeShortcutLabel())

    this.main.webContents.once('did-finish-load', () => this.maybeAutoSetup())
  }

  /** First run with local transcription: quietly install the backend for the user. */
  private maybeAutoSetup(): void {
    if (this.autoSetupStarted) return
    if (this.cfg.transcription.provider !== 'local' || !this.cfg.transcription.autoSetup) return
    this.autoSetupStarted = true
    setTimeout(() => void this.ensureLocalBackend(), 1200)
  }

  /** Setup is idempotent: concurrent callers share the same run. */
  async ensureLocalBackend(): Promise<TranscriptionCheck> {
    if (this.backendSetupPromise) return this.backendSetupPromise
    this.backendSetupPromise = this.runBackendSetup()
    try {
      return await this.backendSetupPromise
    } finally {
      this.backendSetupPromise = null
    }
  }

  private async runBackendSetup(): Promise<TranscriptionCheck> {
    try {
      const existing = await checkBackend(this.cfg)
      if (existing.ok) {
        this.send('transcription:setup-progress', {
          phase: 'done',
          message: 'Local transcription is ready.',
          percent: 100
        })
        return existing
      }
      const result = await setupLocalBackend(this.cfg, (progress) =>
        this.send('transcription:setup-progress', progress)
      )
      if (result.ok) {
        this.toast('success', 'Local transcription ready', 'Recordings are transcribed on this machine.')
      } else {
        this.toast('error', 'Local transcription setup failed', result.error)
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.toast('error', 'Local transcription setup failed', message)
      return { ok: false, python: '', backend: null, error: message }
    }
  }

  private attachWindowBehavior(win: BrowserWindow): void {
    win.on('close', (event) => {
      if (this.quitting) return
      if (this.cfg.minimizeToTray) {
        event.preventDefault()
        win.hide()
      }
    })
  }

  // ── shortcut handling ──────────────────────────────────────────────────────

  private defaultBinding(): ShortcutBinding {
    return {
      keycode: 3640,
      label: process.platform === 'darwin' ? 'Right Option' : 'Right Alt',
      ctrl: false,
      alt: false,
      shift: false,
      meta: false
    }
  }

  private activeShortcutLabel(): string {
    return this.shortcuts.usingFallback ? (this.fallbackLabel ?? this.cfg.shortcut.label) : this.cfg.shortcut.label
  }

  private ensureShortcut(): void {
    if (this.cfg.shortcut.keycode === null && this.cfg.shortcut.label === 'Unset') {
      this.cfg = saveConfig({ shortcut: this.defaultBinding() })
    }
  }

  private applyShortcut(binding: ShortcutBinding, persist: boolean): void {
    if (persist) {
      this.fallbackLabel = null
      this.cfg = saveConfig({ shortcut: binding })
      this.tray?.rebuild(binding.label)
      this.send('config:changed', this.cfg)
      this.emitState()
      return
    }
    this.fallbackLabel = binding.label
    this.tray?.rebuild(this.activeShortcutLabel())
    this.emitState()
  }

  private onTriggerDown(): void {
    if (this.cfg.triggerMode === 'toggle') {
      this.recording ? this.stopRecording() : this.startRecording()
    } else if (!this.recording) {
      this.startRecording()
    }
    this.send('shortcut:down', undefined)
  }

  private onTriggerUp(): void {
    if (this.cfg.triggerMode === 'hold' && this.recording) this.stopRecording()
    this.send('shortcut:up', undefined)
  }

  /** Marks the session as recording, whatever asked for it. */
  private beginCapture(): void {
    this.recording = true
    this.startedAt = Date.now()
    this.level = 0
    this.peak = 0
    this.showOverlay()
    this.tray?.setRecording(true, this.activeShortcutLabel())
    this.emitState()
    if (this.overlayTimer) clearInterval(this.overlayTimer)
    this.overlayTimer = setInterval(() => this.pushOverlay(), 50)
  }

  startRecording(): void {
    if (this.recording) return
    this.send('recorder:command', { type: 'start' })
    this.beginCapture()
  }

  stopRecording(): void {
    if (!this.recording) return
    this.recording = false
    this.send('recorder:command', { type: 'stop' })
    if (this.overlayTimer) clearInterval(this.overlayTimer)
    this.overlayTimer = null
    this.pushOverlay()
    this.tray?.setRecording(false, this.activeShortcutLabel())
    this.emitState()
  }

  // ── overlay ────────────────────────────────────────────────────────────────

  private showOverlay(): void {
    if (!this.cfg.showOverlay || !this.overlay || this.overlay.isDestroyed()) return
    positionOverlay(this.overlay, this.cfg)
    this.overlay.showInactive()
    this.pushOverlay()
  }

  private hideOverlay(): void {
    if (!this.overlay || this.overlay.isDestroyed()) return
    this.overlay.hide()
  }

  private pushOverlay(): void {
    if (!this.overlay || this.overlay.isDestroyed() || !this.overlay.isVisible()) return
    const state: OverlayState = {
      visible: true,
      recording: this.recording,
      elapsedMs: this.startedAt ? Date.now() - this.startedAt : 0,
      level: this.level,
      peak: this.peak,
      hint: this.recording ? 'Release to save' : 'Saving…',
      deviceLabel: this.deviceLabel
    }
    this.overlay.webContents.send('overlay:state', state)
  }

  // ── recording save ─────────────────────────────────────────────────────────

  private handleSave(payload: SaveAudioPayload): RecordingMeta | null {
    if (payload.durationMs < this.cfg.minDurationMs) {
      this.toast('warning', 'Too short', 'That recording was discarded.')
      this.finishRecording()
      return null
    }
    if (payload.peak < this.cfg.silenceThreshold) {
      this.toast('warning', 'Too quiet', 'Nothing above the silence threshold was captured.')
      this.finishRecording()
      return null
    }
    try {
      const { meta } = writeRecording(payload, this.cfg)
      this.lastSaved = meta
      SESSION_PASTE.add(meta.path)
      this.broadcast('recording:saved', { meta })
      this.emitLibraryChanged()
      this.runHook(meta.path)

      if (this.cfg.autoTranscribe && this.cfg.transcription.provider !== 'none') {
        this.transcription.enqueue(meta.path)
      }
      this.toast('success', 'Saved', meta.name)
      this.finishRecording()
      return meta
    } catch (err) {
      this.toast('error', 'Could not save recording', err instanceof Error ? err.message : String(err))
      this.finishRecording()
      return null
    }
  }

  private finishRecording(): void {
    this.recording = false
    this.startedAt = null
    this.level = 0
    setTimeout(() => this.hideOverlay(), 550)
    this.tray?.setRecording(false, this.activeShortcutLabel())
    this.emitState()
  }

  private runHook(filePath: string): void {
    if (!this.cfg.hook.trim()) return
    const parts = this.cfg.hook.split(/\s+/).map((token) => token.replace(/\{file\}/g, filePath))
    try {
      const child = spawn(parts[0], parts.slice(1), { stdio: 'ignore', detached: true })
      child.on('error', () => undefined)
      child.unref()
    } catch {
      /* ignore */
    }
  }

  // ── IPC ────────────────────────────────────────────────────────────────────

  private registerIpc(): void {
    ipcMain.handle('state:get', () => this.buildState())
    ipcMain.handle('config:get', () => this.cfg)
    ipcMain.handle('config:set', (_e, patch: DeepPartial<AppConfig>) => {
      const before = this.cfg
      this.cfg = saveConfig(patch)
      if (patch.shortcut) this.shortcuts.setBinding(this.cfg.shortcut)
      if (patch.outputDir) ensureDir(this.cfg.outputDir)
      if (patch.showOverlay !== undefined || patch.overlayPosition) {
        positionOverlay(this.overlay!, this.cfg)
      }
      if (patch.launchAtLogin !== undefined) {
        app.setLoginItemSettings({ openAtLogin: this.cfg.launchAtLogin })
      }
      if (patch.shortcut) this.tray?.rebuild(this.activeShortcutLabel())
      this.broadcast('config:changed', this.cfg)
      this.emitState()
      if (before.outputDir !== this.cfg.outputDir) this.emitLibraryChanged()
      return this.cfg
    })
    ipcMain.handle('config:reset', () => {
      this.cfg = resetConfig()
      this.shortcuts.setBinding(this.cfg.shortcut)
      this.broadcast('config:changed', this.cfg)
      this.emitState()
      return this.cfg
    })

    ipcMain.handle('shortcut:begin-capture', () => this.shortcuts.beginCapture())
    ipcMain.handle('shortcut:cancel-capture', () => this.shortcuts.cancelCapture())

    ipcMain.on('recorder:level', (_e, level: number) => {
      this.level = level
      this.peak = Math.max(this.peak, level)
    })
    ipcMain.on('recorder:started', (_e, deviceLabel?: string) => {
      this.deviceLabel = deviceLabel ?? this.cfg.inputDeviceLabel
      if (!this.recording) this.beginCapture()
      else this.emitState()
    })
    ipcMain.on('recorder:stopped', () => {
      this.pushOverlay()
    })
    ipcMain.handle('recorder:save', (_e, payload: SaveAudioPayload) => this.handleSave(payload))

    ipcMain.handle('transcription:check', () => checkBackend(this.cfg))
    ipcMain.handle('transcription:setup', () => this.ensureLocalBackend())
    ipcMain.handle('transcription:cancel-setup', () => {
      cancelSetup()
    })

    ipcMain.handle('library:list', () => listRecordings(this.cfg))
    ipcMain.handle('library:transcribe', async (_e, path: string) => {
      if (!existsSync(path)) return { text: null, error: 'file not found' }
      const result = await transcribeFile(path, this.cfg)
      this.broadcast('transcript:update', {
        id: path,
        path,
        text: result.text,
        status: result.text ? 'done' : 'error',
        error: result.error
      })
      this.emitLibraryChanged()
      return result
    })
    ipcMain.handle('library:remove', (_e, path: string) => {
      deleteRecording(path)
      SESSION_PASTE.delete(path)
      this.emitLibraryChanged()
    })
    ipcMain.handle('library:reveal', (_e, path: string) => shell.showItemInFolder(path))
    ipcMain.handle('library:open', (_e, path: string) => shell.openPath(path))

    ipcMain.handle('clipboard:write', (_e, text: string) => clipboard.writeText(text))
    ipcMain.handle('paste:perform', async () => {
      const text = await clipboard.readText()
      await deliverText(text, this.cfg)
    })

    ipcMain.handle('system:info', (): SystemInfo => ({
      version: app.getVersion(),
      platform: process.platform,
      accessibilityTrusted:
        process.platform === 'darwin' ? systemPreferences.isTrustedAccessibilityClient(false) : true,
      usingFallbackShortcut: this.shortcuts.usingFallback
    }))
    ipcMain.handle('system:open-folder', (_e, dir?: string) => shell.openPath(dir || this.cfg.outputDir))
    ipcMain.handle('system:choose-folder', async () => {
      const result = await dialog.showOpenDialog(this.main!, {
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: this.cfg.outputDir
      })
      if (result.canceled || !result.filePaths[0]) return null
      return result.filePaths[0]
    })
    ipcMain.handle('system:open-accessibility', () => {
      if (process.platform === 'darwin') {
        void shell.openExternal(
          'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
        )
      }
    })

    ipcMain.handle('window:hide', () => this.main?.hide())
    ipcMain.handle('window:minimize', () => this.main?.minimize())
    ipcMain.handle('window:show', () => this.showMain())
    ipcMain.handle('window:set-overlay-enabled', (_e, enabled: boolean) => {
      this.cfg = saveConfig({ showOverlay: enabled })
      if (!enabled) this.hideOverlay()
      this.broadcast('config:changed', this.cfg)
    })
    ipcMain.handle('window:set-overlay-position', (_e, position: 'top' | 'bottom') => {
      this.cfg = saveConfig({ overlayPosition: position })
      if (this.overlay) positionOverlay(this.overlay, this.cfg)
      this.broadcast('config:changed', this.cfg)
    })
    ipcMain.handle('app:quit', () => this.quit())
    ipcMain.handle('app:relaunch', () => {
      app.relaunch()
      this.quit()
    })
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  showMain(): void {
    if (!this.main) this.main = createMainWindow()
    if (this.main.isMinimized()) this.main.restore()
    this.main.show()
    this.main.focus()
  }

  private quit(): void {
    this.quitting = true
    if (this.overlayTimer) clearInterval(this.overlayTimer)
    this.overlayTimer = null
    this.shortcuts.stop()
    this.tray?.destroy()
    app.quit()
  }

  private buildState(): AppStateSnapshot {
    return {
      recording: this.recording,
      startedAt: this.startedAt,
      elapsedMs: this.startedAt ? Date.now() - this.startedAt : 0,
      level: this.level,
      peak: this.peak,
      deviceLabel: this.deviceLabel ?? this.cfg.inputDeviceLabel,
      lastSaved: this.lastSaved,
      transcriberRunning: this.transcription.isRunning,
      queueDepth: this.transcription.depth,
      shortcutLabel: this.activeShortcutLabel(),
      mode: this.cfg.triggerMode,
      shortcutFallback: this.shortcuts.usingFallback
    }
  }

  private emitState(): void {
    this.send('state', this.buildState())
  }

  private emitLibraryChanged(): void {
    this.send('library:changed', undefined)
  }

  private broadcast(channel: string, payload: unknown): void {
    this.send(channel, payload)
  }

  private send(channel: string, payload: unknown): void {
    if (this.main && !this.main.isDestroyed()) this.main.webContents.send(channel, payload)
  }

  private toast(kind: ToastKind, title: string, body?: string): void {
    const toast: ToastMessage = { id: randomUUID(), kind, title, body, at: Date.now() }
    this.send('toast', toast)
  }

  private buildMenu(): void {
    if (process.platform !== 'darwin') {
      Menu.setApplicationMenu(null)
      return
    }
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Buddy',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Settings…',
            accelerator: 'Command+,',
            click: () => {
              this.showMain()
              this.send('navigate', 'settings')
            }
          },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      { role: 'windowMenu' }
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }
}
