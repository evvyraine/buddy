import { Mp3Encoder } from '@breezystack/lamejs'
import type { AudioFormat, SaveAudioPayload } from '../../../shared/types'

const TARGET_SAMPLE_RATE = 48000

const WORKLET_SOURCE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.chunks = []
    this.count = 0
    this.size = 2048
    this.sumSquares = 0
    this.peak = 0
  }
  process(inputs) {
    const input = inputs[0]
    if (!input || !input.length) return true
    const frames = input[0].length
    const mono = new Float32Array(frames)
    for (let c = 0; c < input.length; c++) {
      const channel = input[c]
      for (let i = 0; i < frames; i++) mono[i] += channel[i]
    }
    for (let i = 0; i < frames; i++) mono[i] /= input.length
    for (let i = 0; i < frames; i++) {
      const v = mono[i]
      this.sumSquares += v * v
      const a = v < 0 ? -v : v
      if (a > this.peak) this.peak = a
    }
    this.chunks.push(mono)
    this.count += frames
    if (this.count >= this.size) {
      const out = new Float32Array(this.count)
      let offset = 0
      for (const chunk of this.chunks) { out.set(chunk, offset); offset += chunk.length }
      const rms = Math.sqrt(this.sumSquares / this.count)
      this.port.postMessage({ samples: out, rms, peak: this.peak }, [out.buffer])
      this.chunks = []
      this.count = 0
      this.sumSquares = 0
      this.peak = 0
    }
    return true
  }
}
registerProcessor('buddy-pcm', PCMProcessor)
`

export interface RecorderHandlers {
  onLevel?: (level: number, peak: number) => void
  onStarted?: (label: string | null) => void
  onError?: (message: string) => void
}

export interface StartOptions {
  deviceId: string | null
  deviceLabel: string | null
  format: AudioFormat
}

function normalizeDb(rms: number): number {
  if (rms <= 0.0000001) return 0
  const db = 20 * Math.log10(rms)
  return Math.max(0, Math.min(1, (db + 60) / 48))
}

function toInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function encodeMp3(samples: Int16Array, sampleRate: number): Uint8Array | null {
  try {
    const encoder = new Mp3Encoder(1, sampleRate, 192)
    const parts: Uint8Array[] = []
    const block = 1152
    for (let i = 0; i < samples.length; i += block) {
      const buffer = encoder.encodeBuffer(samples.subarray(i, i + block))
      if (buffer.length) parts.push(new Uint8Array(buffer))
    }
    const tail = encoder.flush()
    if (tail.length) parts.push(new Uint8Array(tail))
    const total = parts.reduce((sum, part) => sum + part.length, 0)
    const merged = new Uint8Array(total)
    let offset = 0
    for (const part of parts) {
      merged.set(part, offset)
      offset += part.length
    }
    return merged
  } catch {
    return null
  }
}

export class RecordingEngine {
  private stream: MediaStream | null = null
  private context: AudioContext | null = null
  private node: AudioWorkletNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private sink: GainNode | null = null
  private chunks: Float32Array[] = []
  private sampleRate = TARGET_SAMPLE_RATE
  private peakSample = 0
  private active = false
  private options: StartOptions = { deviceId: null, deviceLabel: null, format: 'wav' }

  constructor(private handlers: RecorderHandlers = {}) {}

  get isRecording(): boolean {
    return this.active
  }

  async start(options: StartOptions): Promise<boolean> {
    if (this.active) return true
    this.options = options
    this.chunks = []
    this.peakSample = 0

    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      }
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)

      const context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
      if (context.state === 'suspended') await context.resume()
      this.context = context
      this.sampleRate = context.sampleRate

      const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      await context.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)

      this.source = context.createMediaStreamSource(this.stream)
      this.node = new AudioWorkletNode(context, 'buddy-pcm')
      this.node.port.onmessage = (event) => {
        const { samples, rms, peak } = event.data as {
          samples: Float32Array
          rms: number
          peak: number
        }
        this.chunks.push(samples)
        this.peakSample = Math.max(this.peakSample, peak)
        this.handlers.onLevel?.(normalizeDb(rms), Math.min(1, this.peakSample * 1.6))
      }

      this.sink = context.createGain()
      this.sink.gain.value = 0
      this.source.connect(this.node)
      this.node.connect(this.sink)
      this.sink.connect(context.destination)

      this.active = true
      this.handlers.onStarted?.(options.deviceLabel)
      return true
    } catch (err) {
      this.handlers.onError?.(err instanceof Error ? err.message : String(err))
      await this.teardown()
      return false
    }
  }

  async stop(): Promise<SaveAudioPayload | null> {
    if (!this.active) return null
    this.active = false
    await new Promise((resolve) => setTimeout(resolve, 60))

    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const merged = new Float32Array(total)
    let offset = 0
    for (const chunk of this.chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const durationMs = (total / this.sampleRate) * 1000
    const peak = Math.round(this.peakSample * 32767)
    const format = this.options.format
    const sampleRate = this.sampleRate
    const deviceLabel = this.options.deviceLabel

    await this.teardown()

    if (total === 0) return null

    const int16 = toInt16(merged)

    if (format === 'mp3') {
      const bytes = encodeMp3(int16, sampleRate)
      if (bytes) {
        return {
          kind: 'encoded',
          format: 'mp3',
          bytes: bytes.buffer as ArrayBuffer,
          sampleRate,
          durationMs,
          peak,
          deviceLabel
        }
      }
    }

    return {
      kind: 'pcm',
      pcm: int16.buffer as ArrayBuffer,
      sampleRate,
      durationMs,
      peak,
      deviceLabel
    }
  }

  async cancel(): Promise<void> {
    this.active = false
    await this.teardown()
  }

  private async teardown(): Promise<void> {
    try {
      this.node?.port.close()
      this.node?.disconnect()
      this.source?.disconnect()
      this.sink?.disconnect()
      this.stream?.getTracks().forEach((track) => track.stop())
      if (this.context && this.context.state !== 'closed') await this.context.close()
    } catch {
      /* ignore */
    }
    this.node = null
    this.source = null
    this.sink = null
    this.stream = null
    this.context = null
    this.chunks = []
  }
}
