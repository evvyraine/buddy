import { app } from 'electron'
import { EventEmitter } from 'node:events'
import { spawn } from 'node:child_process'
import { basename, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { AppConfig, TranscribeResult, TranscriptionCheck } from '../shared/types'
import { writeTranscript } from './audioFile'

export function transcribeHelperPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'transcribe.py')
    : join(app.getAppPath(), 'resources', 'transcribe.py')
}

/**
 * A self-contained environment Buddy can manage, so local transcription works
 * without touching the system Python or relying on the user's PATH.
 */
function venvPython(root: string): string {
  const executable = process.platform === 'win32' ? 'python.exe' : 'python3'
  return join(root, process.platform === 'win32' ? 'Scripts' : 'bin', executable)
}

/** Buddy's own environment, so local transcription never depends on the system Python. */
export function managedVenvPython(): string {
  return venvPython(join(app.getPath('userData'), 'venv'))
}

/** Locations checked, in order, when the settings path is left at its default. */
function pythonCandidates(): string[] {
  const appPath = app.getAppPath()
  return [
    venvPython(join(appPath, 'resources', '.venv')),
    venvPython(join(appPath, '.venv')),
    managedVenvPython()
  ]
}

export function resolvePythonPath(cfg: AppConfig): string {
  const configured = cfg.transcription.pythonPath?.trim()
  if (configured && configured !== 'python3' && configured !== 'python') return configured
  for (const candidate of pythonCandidates()) {
    if (existsSync(candidate)) return candidate
  }
  return configured || 'python3'
}

const BACKEND_PROBE =
  "import importlib.util as u\n" +
  "print('faster-whisper' if u.find_spec('faster_whisper') else 'openai-whisper' if u.find_spec('whisper') else 'none')"

/** Reports whether the local transcription backend can actually run. */
export function checkBackend(cfg: AppConfig): Promise<TranscriptionCheck> {
  const python = resolvePythonPath(cfg)
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (result: TranscriptionCheck): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }

    let child: ReturnType<typeof spawn>
    try {
      child = spawn(python, ['-c', BACKEND_PROBE], { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) {
      resolve({ ok: false, python, backend: null, error: err instanceof Error ? err.message : String(err) })
      return
    }

    const timer = setTimeout(() => {
      child.kill()
      finish({ ok: false, python, backend: null, error: 'timed out while probing Python' })
    }, 15000)

    child.stdout?.on('data', (chunk) => (stdout += chunk.toString()))
    child.stderr?.on('data', (chunk) => (stderr += chunk.toString()))
    child.on('error', (err) => finish({ ok: false, python, backend: null, error: err.message }))
    child.on('close', () => {
      const name = stdout.trim()
      if (name === 'faster-whisper' || name === 'openai-whisper') {
        finish({ ok: true, python, backend: name })
      } else {
        finish({ ok: false, python, backend: null, error: stderr.trim() || 'no whisper backend installed' })
      }
    })
  })
}

async function transcribeWithOpenAI(filePath: string, cfg: AppConfig): Promise<TranscribeResult> {
  const { apiKey, baseUrl, model } = cfg.transcription.openai
  if (!apiKey) return { text: null, error: 'no OpenAI API key configured' }
  try {
    const bytes = readFileSync(filePath)
    const form = new FormData()
    form.append('file', new Blob([bytes]), basename(filePath))
    form.append('model', model || 'whisper-1')
    if (cfg.transcription.language && cfg.transcription.language !== 'auto') {
      form.append('language', cfg.transcription.language)
    }
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText)
      return { text: null, error: `OpenAI error ${res.status}: ${detail.slice(0, 300)}` }
    }
    const data = (await res.json()) as { text?: string }
    const text = (data.text ?? '').trim()
    return { text: text || null }
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : String(err) }
  }
}

function transcribeLocally(filePath: string, cfg: AppConfig): Promise<TranscribeResult> {
  return new Promise((resolve) => {
    const args = [
      transcribeHelperPath(),
      filePath,
      cfg.transcription.localModel,
      cfg.transcription.language || 'auto'
    ]
    const python = resolvePythonPath(cfg)
    let stdout = ''
    let stderr = ''
    let settled = false
    const child = spawn(python, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => {
      if (!settled) {
        child.kill()
        settled = true
        resolve({ text: null, error: 'transcription timed out' })
      }
    }, 1000 * 60 * 20)

    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ text: null, error: `could not run ${python}: ${err.message}` })
    })
    child.on('close', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        const parsed = JSON.parse(stdout.trim()) as TranscribeResult
        resolve({ text: parsed.text ?? null, error: parsed.error ?? undefined })
      } catch {
        resolve({ text: null, error: stderr.trim() || 'unexpected output from transcribe helper' })
      }
    })
  })
}

export async function transcribeFile(filePath: string, cfg: AppConfig): Promise<TranscribeResult> {
  switch (cfg.transcription.provider) {
    case 'openai':
      return transcribeWithOpenAI(filePath, cfg)
    case 'local':
      return transcribeLocally(filePath, cfg)
    default:
      return { text: null, error: 'transcription disabled' }
  }
}

interface QueueEvents {
  update: [path: string, text: string | null, error?: string]
}

export class TranscriptionQueue extends EventEmitter<QueueEvents> {
  private queue: string[] = []
  private running = false
  private active: string | null = null
  constructor(private getConfig: () => AppConfig) {
    super()
  }

  get isRunning(): boolean {
    return this.running
  }

  get depth(): number {
    return this.queue.length + (this.active ? 1 : 0)
  }

  get activePath(): string | null {
    return this.active
  }

  enqueue(path: string): void {
    if (this.queue.includes(path) || this.active === path) return
    this.queue.push(path)
    void this.drain()
  }

  private async drain(): Promise<void> {
    if (this.running) return
    this.running = true
    while (this.queue.length) {
      const path = this.queue.shift()!
      this.active = path
      const result = await transcribeFile(path, this.getConfig())
      if (result.text) {
        try {
          writeTranscript(path, result.text)
        } catch {
          /* ignore */
        }
      }
      this.active = null
      this.emit('update', path, result.text, result.error)
    }
    this.running = false
  }
}
