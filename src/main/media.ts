import { protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { extname } from 'node:path'

export const MEDIA_SCHEME = 'buddy'

const MIME: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg'
}

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true }
    }
  ])
}

function toPath(requestUrl: string): string {
  const url = new URL(requestUrl)
  const encoded = url.pathname.replace(/^\//, '')
  return Buffer.from(decodeURIComponent(encoded), 'base64url').toString('utf8')
}

export function registerMediaProtocol(): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const filePath = toPath(request.url)
      const info = await stat(filePath)
      const contentType = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      const range = request.headers.get('Range')

      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range)
        const start = match ? Number(match[1]) : 0
        const end = match && match[2] ? Number(match[2]) : info.size - 1
        const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream
        return new Response(stream, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${info.size}`,
            'Content-Length': String(end - start + 1)
          }
        })
      }

      const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(info.size)
        }
      })
    } catch {
      return new Response('not found', { status: 404 })
    }
  })
}


