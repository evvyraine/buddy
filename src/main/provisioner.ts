import { app } from 'electron'
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, rmSync, chmodSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import type { AppConfig, SetupProgress, TranscriptionCheck } from '../shared/types'
import { checkBackend, resolvePythonPath } from './transcription'

type ProgressHandler = (progress: SetupProgress) => void

const UV_VERSION = 'latest'
const PACKAGES = ['faster-whisper', 'av==13.1.0', 'huggingface_hub<1.0']

function binDir(): string {
  return join(app.getPath('userData'), 'bin')
}

function uvPath(): string {
  return join(binDir(), process.platform === 'win32' ? 'uv.exe' : 'uv')
}

export function venvDir(): string {
  return join(app.getPath('userData'), 'venv')
}

export function venvPython(root = venvDir()): string {
  const executable = process.platform === 'win32' ? 'python.exe' : 'python3'
  return join(root, process.platform === 'win32' ? 'Scripts' : 'bin', executable)
}

function uvTarget(): { target: string; ext: string } {
  const arch = process.arch
  if (process.platform === 'darwin') {
    return { target: arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin', ext: 'tar.gz' }
  }
  if (process.platform === 'win32') {
    return { target: arch === 'arm64' ? 'aarch64-pc-windows-msvc' : 'x86_64-pc-windows-msvc', ext: 'zip' }
  }
  return { target: arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu', ext: 'tar.gz' }
}

interface RunResult {
  code: number
  stdout: string
  stderr: string
}

const activeChildren = new Set<ReturnType<typeof spawn>>()

function run(command: string, args: string[], onLine?: (line: string) => void): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (err) {
      resolve({ code: -1, stdout: '', stderr: err instanceof Error ? err.message : String(err) })
      return
    }
    activeChildren.add(child)
    const handle = (chunk: Buffer): void => {
      stdout += chunk.toString()
      if (onLine) {
        for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) onLine(line.trim())
      }
    }
    child.stdout?.on('data', handle)
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
      if (onLine) {
        for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) onLine(line.trim())
      }
    })
    child.on('error', (err) => {
      activeChildren.delete(child)
      resolve({ code: -1, stdout, stderr: err.message })
    })
    child.on('close', (code) => {
      activeChildren.delete(child)
      resolve({ code: code ?? -1, stdout, stderr })
    })
  })
}

export function cancelSetup(): void {
  for (const child of activeChildren) {
    try {
      child.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }
  activeChildren.clear()
}

async function findUv(): Promise<string | null> {
  const bundled = uvPath()
  if (existsSync(bundled)) return bundled
  const probe = await run(process.platform === 'win32' ? 'where' : 'which', ['uv'])
  const found = probe.stdout.trim().split(/\r?\n/)[0]
  return probe.code === 0 && found ? found : null
}

async function downloadUv(onProgress: ProgressHandler): Promise<string | null> {
  const { target, ext } = uvTarget()
  const url = `https://github.com/astral-sh/uv/releases/${UV_VERSION}/download/uv-${target}.${ext}`
  const archive = join(binDir(), `uv-download.${ext}`)
  mkdirSync(binDir(), { recursive: true })

  onProgress({ phase: 'uv', message: 'Downloading the setup tool…', percent: 2 })

  const response = await fetch(url).catch(() => null)
  if (!response || !response.ok || !response.body) return null

  const total = Number(response.headers.get('content-length') ?? 0)
  let received = 0
  const stream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0])
  stream.on('data', (chunk: Buffer) => {
    received += chunk.length
    const ratio = total ? received / total : 0
    onProgress({
      phase: 'uv',
      message: 'Downloading the setup tool…',
      percent: Math.round(2 + ratio * 8)
    })
  })
  await pipeline(stream, createWriteStream(archive))

  const extractDir = join(binDir(), 'uv-extract')
  rmSync(extractDir, { recursive: true, force: true })
  mkdirSync(extractDir, { recursive: true })

  const extracted = await run('tar', ['-xf', archive, '-C', extractDir])
  rmSync(archive, { force: true })
  if (extracted.code !== 0) return null

  let binary: string | null = null
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === (process.platform === 'win32' ? 'uv.exe' : 'uv')) binary = full
    }
  }
  walk(extractDir)
  if (!binary) return null

  renameSync(binary, uvPath())
  if (process.platform !== 'win32') chmodSync(uvPath(), 0o755)
  rmSync(extractDir, { recursive: true, force: true })
  return uvPath()
}

export async function ensureUv(onProgress: ProgressHandler): Promise<string | null> {
  return (await findUv()) ?? (await downloadUv(onProgress))
}

function countInstalled(line: string): number {
  return line.startsWith('+') || line.includes('Installed ') ? 1 : 0
}

/** Creates Buddy's Python environment and installs the local Whisper backend. */
export async function setupLocalBackend(
  cfg: AppConfig,
  onProgress: ProgressHandler
): Promise<TranscriptionCheck> {
  const existing = await checkBackend(cfg)
  if (existing.ok) return existing

  onProgress({ phase: 'prepare', message: 'Preparing…', percent: 1 })

  const uv = await ensureUv(onProgress)
  if (!uv) {
    onProgress({ phase: 'error', message: 'Could not fetch the setup tool.', percent: 0 })
    return {
      ok: false,
      python: resolvePythonPath(cfg),
      backend: null,
      error: 'Could not download uv. Check your internet connection, or set a Python path manually.'
    }
  }

  const target = venvDir()

  if (!existsSync(venvPython(target))) {
    onProgress({ phase: 'venv', message: 'Creating the Python environment…', percent: 14 })
    rmSync(target, { recursive: true, force: true })
    const created = await run(uv, ['venv', '--python', '3.13', target], (line) =>
      onProgress({ phase: 'venv', message: line, percent: 18 })
    )
    if (created.code !== 0) {
      const error = created.stderr.trim() || 'Could not create the Python environment.'
      onProgress({ phase: 'error', message: error, percent: 0 })
      return { ok: false, python: venvPython(target), backend: null, error }
    }
  }

  onProgress({ phase: 'install', message: 'Installing the Whisper backend…', percent: 24 })
  let installed = 0
  const install = await run(
    uv,
    ['pip', 'install', '--python', venvPython(target), ...PACKAGES],
    (line) => {
      installed += countInstalled(line)
      onProgress({
        phase: 'install',
        message: line,
        percent: Math.min(90, 24 + installed * 4)
      })
    }
  )
  if (install.code !== 0) {
    const error = install.stderr.trim() || 'Could not install the Whisper backend.'
    onProgress({ phase: 'error', message: error, percent: 0 })
    return { ok: false, python: venvPython(target), backend: null, error }
  }

  // hf-xet breaks model downloads with the pinned huggingface_hub.
  await run(uv, ['pip', 'uninstall', '--python', venvPython(target), 'hf-xet'])

  onProgress({ phase: 'verify', message: 'Verifying…', percent: 92 })
  const check = await checkBackend({
    ...cfg,
    transcription: { ...cfg.transcription, pythonPath: venvPython(target) }
  })
  if (!check.ok) {
    onProgress({ phase: 'error', message: check.error ?? 'Setup failed.', percent: 0 })
    return check
  }

  // Pull the model now so the first recording does not stall on a download.
  onProgress({ phase: 'model', message: 'Downloading the speech model…', percent: 95 })
  const model = cfg.transcription.localModel
  const script = `from faster_whisper import WhisperModel\nWhisperModel(${JSON.stringify(model)})\n`
  await run(venvPython(target), ['-c', script])

  onProgress({ phase: 'done', message: 'Local transcription is ready.', percent: 100 })
  return check
}
