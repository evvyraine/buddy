import { app, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'

export interface TrayHandlers {
  onToggleRecord: () => void
  onShow: () => void
  onOpenFolder: () => void
  onSettings: () => void
  onQuit: () => void
}

export class BuddyTray {
  private tray: Tray | null = null
  private recording = false

  constructor(private handlers: TrayHandlers) {}

  private iconPath(): string {
    const file = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'
    return join(app.getAppPath(), 'resources', file)
  }

  create(shortcutLabel: string): void {
    const image = nativeImage.createFromPath(this.iconPath())
    if (process.platform === 'darwin') image.setTemplateImage(true)
    this.tray = new Tray(image)
    this.tray.setToolTip(`Buddy — hold ${shortcutLabel} to record`)
    this.tray.on('click', () => this.handlers.onShow())
    this.rebuild(shortcutLabel)
  }

  rebuild(shortcutLabel: string): void {
    if (!this.tray) return
    const menu = Menu.buildFromTemplate([
      { label: 'Open Buddy', click: () => this.handlers.onShow() },
      { type: 'separator' },
      {
        label: this.recording ? 'Stop recording' : 'Start recording',
        click: () => this.handlers.onToggleRecord()
      },
      { type: 'separator' },
      { label: `Hold ${shortcutLabel} to record`, enabled: false },
      { type: 'separator' },
      { label: 'Open recordings folder', click: () => this.handlers.onOpenFolder() },
      { label: 'Settings…', click: () => this.handlers.onSettings() },
      { type: 'separator' },
      { label: 'Quit Buddy', click: () => this.handlers.onQuit() }
    ])
    this.tray.setContextMenu(menu)
  }

  setRecording(recording: boolean, shortcutLabel: string): void {
    this.recording = recording
    this.rebuild(shortcutLabel)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
