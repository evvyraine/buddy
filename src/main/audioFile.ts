import {
  closeSync,
  mkdirSync,
  openSync,
  readSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { basename, extname, join } from 'node:path'
import type { AppConfig, AudioFormat, RecordingMeta, SaveAudioPayload } from '../shared/types'

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function buildFilename(pattern: string, format: AudioFormat, now = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  const stamp = `${date}_${time}`
  const raw = (pattern || '{date}_{time}')
    .replace(/\{date\}/g, date)
    .replace(/\{time\}/g, time)
    .replace(/\{datetime\}/g, stamp)
    .replace(/\{timestamp\}/g, String(Date.now()))
  const safe = raw.replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `${safe || stamp}.${format}`
}

export function encodeWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const bitsPerSample = 16
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

export interface WriteResult {
  meta: RecordingMeta
}

export function writeRecording(payload: SaveAudioPayload, cfg: AppConfig): WriteResult {
  ensureDir(cfg.outputDir)
  const name = buildFilename(cfg.filenamePattern, cfg.format)
  const filePath = join(cfg.outputDir, name)

  if (payload.kind === 'pcm') {
    const pcm = Buffer.from(payload.pcm)
    const wav = encodeWav(pcm, payload.sampleRate)
    writeFileSync(filePath, wav)
  } else {
    writeFileSync(filePath, Buffer.from(payload.bytes))
  }

  const stat = statSync(filePath)
  const meta: RecordingMeta = {
    id: filePath,
    name,
    path: filePath,
    format: cfg.format,
    sizeBytes: stat.size,
    durationMs: Math.round(payload.durationMs),
    createdAt: stat.mtimeMs,
    transcript: readTranscript(filePath),
    transcriptStatus: readTranscript(filePath) ? 'done' : 'none'
  }
  return { meta }
}

export function transcriptPath(audioPath: string): string {
  return audioPath.replace(/\.[^.]+$/, '.txt')
}

export function readTranscript(audioPath: string): string | null {
  try {
    const text = readFileSync(transcriptPath(audioPath), 'utf8').trim()
    return text || null
  } catch {
    return null
  }
}

export function writeTranscript(audioPath: string, text: string): void {
  writeFileSync(transcriptPath(audioPath), text, 'utf8')
}

export function deleteRecording(audioPath: string): void {
  try {
    unlinkSync(audioPath)
  } catch {
    /* ignore */
  }
  try {
    unlinkSync(transcriptPath(audioPath))
  } catch {
    /* ignore */
  }
}

function probeDuration(filePath: string, format: AudioFormat, sizeBytes: number): number {
  try {
    if (format === 'mp3') {
      return Math.round((sizeBytes * 8) / 192000 * 1000)
    }
    const fd = openSync(filePath, 'r')
    const header = Buffer.alloc(64)
    readSync(fd, header, 0, 64, 0)
    closeSync(fd)
    if (header.toString('ascii', 0, 4) !== 'RIFF') return 0
    const channels = header.readUInt16LE(22) || 1
    const sampleRate = header.readUInt32LE(24)
    const bits = header.readUInt16LE(34) || 16
    const dataSize = header.readUInt32LE(40)
    if (!sampleRate || !dataSize) return 0
    return Math.round((dataSize / (sampleRate * channels * (bits / 8))) * 1000)
  } catch {
    return 0
  }
}

export function listRecordings(cfg: AppConfig): RecordingMeta[] {
  if (!cfg.outputDir) return []
  let entries: string[]
  try {
    entries = readdirSync(cfg.outputDir)
  } catch {
    return []
  }
  const items: RecordingMeta[] = []
  for (const entry of entries) {
    const ext = extname(entry).toLowerCase()
    if (ext !== '.wav' && ext !== '.mp3') continue
    const full = join(cfg.outputDir, entry)
    try {
      const stat = statSync(full)
      const transcript = readTranscript(full)
      const format: AudioFormat = ext === '.mp3' ? 'mp3' : 'wav'
      items.push({
        id: full,
        name: basename(entry),
        path: full,
        format,
        sizeBytes: stat.size,
        durationMs: probeDuration(full, format, stat.size),
        createdAt: stat.mtimeMs,
        transcript,
        transcriptStatus: transcript ? 'done' : 'none'
      })
    } catch {
      /* skip */
    }
  }
  items.sort((a, b) => b.createdAt - a.createdAt)
  return items.slice(0, cfg.maxLibraryItems)
}
