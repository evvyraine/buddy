import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'node:path'
import type { AppConfig } from '../shared/types'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function rendererUrl(page: string): string {
  const base = process.env['ELECTRON_RENDERER_URL'] as string
  return `${base}/${page}`
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 375,
    minHeight: 520,
    show: false,
    title: 'Buddy',
    backgroundColor: '#00000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) void win.loadURL(rendererUrl('index.html'))
  else void win.loadFile(join(__dirname, '../renderer/index.html'))

  return win
}

export function createOverlayWindow(cfg: AppConfig): BrowserWindow {
  const win = new BrowserWindow({
    width: 480,
    height: 132,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    alwaysOnTop: true,
    acceptFirstMouse: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })

  if (isDev) void win.loadURL(rendererUrl('overlay.html'))
  else void win.loadFile(join(__dirname, '../renderer/overlay.html'))

  positionOverlay(win, cfg)
  return win
}

export function positionOverlay(win: BrowserWindow, cfg: AppConfig): void {
  const display = screen.getPrimaryDisplay()
  const area = display.workArea
  const [w, h] = win.getSize()
  const x = Math.round(area.x + (area.width - w) / 2)
  const y =
    cfg.overlayPosition === 'top'
      ? area.y + 72
      : area.y + area.height - h - 56
  win.setBounds({ x, y, width: w, height: h })
}
