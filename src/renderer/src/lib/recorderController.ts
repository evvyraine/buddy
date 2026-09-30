import type { AppConfig } from '../../../shared/types'
import { RecordingEngine } from './recorder'
import { playCue } from './sound'
import { useBuddy } from './store'

let engine: RecordingEngine | null = null
let configGetter: () => AppConfig | null = () => null
let initialized = false

function getEngine(): RecordingEngine {
  if (!engine) {
    engine = new RecordingEngine({
      onLevel: (level) => window.buddy.recorder.reportLevel(level),
      onError: (message) => {
        useBuddy.getState().pushToast({
          id: crypto.randomUUID(),
          kind: 'error',
          title: 'Microphone unavailable',
          body: message,
          at: Date.now()
        })
      }
    })
  }
  return engine
}

let maxTimer: number | null = null

export async function startRecording(): Promise<void> {
  const recorder = getEngine()
  if (recorder.isRecording) return
  const config = configGetter()
  const ok = await recorder.start({
    deviceId: config?.inputDeviceId ?? null,
    deviceLabel: config?.inputDeviceLabel ?? null,
    format: config?.format ?? 'wav'
  })
  if (!ok) return
  window.buddy.recorder.notifyStart(config?.inputDeviceLabel ?? undefined)
  if (config?.playSounds) playCue('start')

  const maxMs = (config?.maxDurationSec ?? 300) * 1000
  if (maxTimer) window.clearTimeout(maxTimer)
  maxTimer = window.setTimeout(() => void stopRecording(), maxMs)
}

export async function stopRecording(): Promise<void> {
  const recorder = getEngine()
  if (maxTimer) {
    window.clearTimeout(maxTimer)
    maxTimer = null
  }
  if (!recorder.isRecording) return
  const payload = await recorder.stop()
  window.buddy.recorder.notifyStop()
  if (!payload) return
  const meta = await window.buddy.recorder.save(payload)
  if (meta && configGetter()?.playSounds) playCue('save')
}

export async function toggleRecording(): Promise<void> {
  if (getEngine().isRecording) await stopRecording()
  else await startRecording()
}

export function isRecording(): boolean {
  return getEngine().isRecording
}

/**
 * Wires the recorder to the main process exactly once. Must run at app root so
 * the global push-to-talk command reaches the engine on any page.
 */
export function initRecorder(getConfig: () => AppConfig | null): void {
  configGetter = getConfig
  if (initialized) return
  initialized = true
  getEngine()
  window.buddy.recorder.onCommand((command) => {
    if (command.type === 'start') void startRecording()
    else void stopRecording()
  })
}
