import { app, nativeImage, systemPreferences } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BuddyApp } from './app'
import { loadConfig } from './config'
import { registerMediaProtocol, registerMediaScheme } from './media'
import { transcribeFile } from './transcription'

app.setName('Buddy')
registerMediaScheme()

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  let buddy: BuddyApp | null = null

  app.on('second-instance', () => buddy?.showMain())

  app.whenReady().then(() => {
    registerMediaProtocol()
    if (process.platform === 'darwin') {
      const icon = nativeImage.createFromPath(join(app.getAppPath(), 'resources', 'icon.png'))
      if (!icon.isEmpty()) app.dock?.setIcon(icon)
      void systemPreferences.askForMediaAccess('microphone').catch(() => undefined)
    }

    buddy = new BuddyApp()
    buddy.start()

    if (process.env.BUDDY_SMOKE) {
      const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
      setTimeout(async () => {
        const base = process.env.BUDDY_SMOKE as string
        const main = buddy?.getMainWindow()
        const overlay = buddy?.getOverlayWindow()
        const shot = async (suffix: string): Promise<void> => {
          if (!main) return
          await wait(700)
          const image = await main.webContents.capturePage()
          writeFileSync(`${base}-${suffix}.png`, image.toPNG())
        }
        const evalInPage = (script: string): Promise<unknown> =>
          main?.webContents.executeJavaScript(script) ?? Promise.resolve(null)

        await shot('record')

        // Exercise the real record path: click, record for ~2s, click stop.
        await evalInPage(`document.querySelector('button[aria-label="Start recording"]')?.click()`)
        await wait(1400)
        const recordingProbe = await evalInPage(
          `JSON.stringify({
            stopButton: !!document.querySelector('button[aria-label="Stop recording"]'),
            timer: [...document.querySelectorAll('*')].map(e => e.childElementCount === 0 ? e.textContent : '').find(t => /^\\d\\d:\\d\\d\\.\\d$/.test(t || '')) ?? null,
            recordingLabel: !!document.body.innerText.includes('live') || !!document.body.innerText.includes('Capturing')
          })`
        )
        writeFileSync(`${base}-probe.json`, String(recordingProbe))
        if (main) {
          const image = await main.webContents.capturePage()
          writeFileSync(`${base}-recording.png`, image.toPNG())
        }
        if (overlay) {
          const image = await overlay.webContents.capturePage()
          writeFileSync(`${base}-overlay.png`, image.toPNG())
        }
        await evalInPage(`document.querySelector('button[aria-label="Stop recording"]')?.click()`)
        await wait(2600)
        await shot('saved')

        await evalInPage("document.documentElement.dataset.theme='dark'")
        await shot('dark')
        await evalInPage("document.documentElement.dataset.theme='light'")
        main?.webContents.send('navigate', 'settings')
        await shot('settings')
        await evalInPage(
          `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Transcription')?.click()`
        )
        await shot('settings-transcription')
        main?.webContents.send('navigate', 'library')
        await shot('library')
        main?.webContents.send('navigate', 'about')
        await shot('about')

        if (main) {
          const bounds = main.getBounds()
          main.setBounds({ x: bounds.x, y: bounds.y, width: 390, height: 780 })
          main.webContents.send('navigate', 'record')
          await shot('narrow-record')
          main.webContents.send('navigate', 'settings')
          await shot('narrow-settings')
          main.setBounds(bounds)
        }

        if (process.env.BUDDY_SMOKE_TRANSCRIBE) {
          const result = await transcribeFile(process.env.BUDDY_SMOKE_TRANSCRIBE, loadConfig())
          writeFileSync(`${base}-transcribe.json`, JSON.stringify(result))
        }
        app.quit()
      }, 3000)
    }

    app.on('activate', () => buddy?.showMain())
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
