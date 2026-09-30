import { clipboard, systemPreferences } from 'electron'
import { spawn } from 'node:child_process'
import type { AppConfig, PasteAction } from '../shared/types'

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { stdio: 'ignore' })
      child.on('error', () => resolve())
      child.on('close', () => resolve())
    } catch {
      resolve()
    }
  })
}

export function copyToClipboard(text: string): void {
  clipboard.writeText(text)
}

export async function simulatePaste(): Promise<void> {
  const platform = process.platform
  if (platform === 'darwin') {
    await run('osascript', [
      '-e',
      'tell application "System Events" to keystroke "v" using command down'
    ])
  } else if (platform === 'win32') {
    await run('powershell', [
      '-NoProfile',
      '-Command',
      "(New-Object -ComObject wscript.shell).SendKeys('^v')"
    ])
  } else {
    await run('xdotool', ['key', '--clearmodifiers', 'ctrl+v']).then(() =>
      run('ydotool', ['key', '29:1', '47:1', '47:0', '29:0'])
    )
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export async function deliverText(text: string, cfg: AppConfig): Promise<void> {
  const action: PasteAction = cfg.afterTranscribe
  if (action === 'none' || !text.trim()) return

  if (action === 'clipboard' || action === 'both') copyToClipboard(text)
  if (action === 'paste' || action === 'both') {
    copyToClipboard(text)
    const granted =
      process.platform === 'darwin' ? systemPreferences.isTrustedAccessibilityClient(false) : true
    if (!granted) return
    await delay(cfg.pasteDelayMs)
    await simulatePaste()
  }
}
