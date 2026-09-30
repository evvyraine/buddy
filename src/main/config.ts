import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { AppConfig, DeepPartial } from '../shared/types'

const DEFAULT_MODEL = 'base'

export function defaultConfig(): AppConfig {
  return {
    theme: 'system',
    accent: 'pink',
    animations: true,
    sidebarCollapsed: false,

    shortcut: { keycode: null, label: 'Unset', ctrl: false, alt: false, shift: false, meta: false },
    triggerMode: 'hold',

    inputDeviceId: null,
    inputDeviceLabel: null,

    outputDir: join(homedir(), 'Documents', 'Buddy'),
    format: 'wav',
    filenamePattern: '{date}_{time}',

    minDurationMs: 300,
    silenceThreshold: 300,
    maxDurationSec: 300,

    autoTranscribe: true,
    transcription: {
      provider: 'local',
      localModel: DEFAULT_MODEL as AppConfig['transcription']['localModel'],
      pythonPath: 'python3',
      autoSetup: true,
      openai: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'whisper-1'
      },
      language: 'auto'
    },

    afterTranscribe: 'clipboard',
    pasteDelayMs: 120,

    hook: '',

    showOverlay: true,
    overlayPosition: 'bottom',
    playSounds: true,
    launchAtLogin: false,
    minimizeToTray: true,
    saveToLibrary: true,

    maxLibraryItems: 500
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!isObject(patch)) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch)) {
    const current = out[key]
    if (isObject(current) && isObject(value)) out[key] = deepMerge(current, value)
    else if (value !== undefined) out[key] = value
  }
  return out as T
}

let cache: AppConfig | null = null

function configPath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function loadConfig(): AppConfig {
  if (cache) return cache
  const base = defaultConfig()
  const file = configPath()
  if (!existsSync(file)) {
    cache = base
    return cache
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    cache = deepMerge(base, parsed)
  } catch {
    cache = base
  }
  return cache
}

export function saveConfig(patch: DeepPartial<AppConfig>): AppConfig {
  const next = deepMerge(loadConfig(), patch)
  cache = next
  const file = configPath()
  mkdirSync(dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
  renameSync(tmp, file)
  return next
}

export function resetConfig(): AppConfig {
  cache = defaultConfig()
  const file = configPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8')
  return cache
}
