export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatTimer(ms: number): string {
  const total = Math.max(0, ms)
  const m = Math.floor(total / 60000)
  const s = Math.floor((total % 60000) / 1000)
  const cs = Math.floor((total % 1000) / 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${cs}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.round(diff / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function glyph(label: string): string {
  return label
    .replace(/Right Option|Left Option|Option/g, '\u2325')
    .replace(/Right Command|Left Command|Command/g, '\u2318')
    .replace(/Right Control|Left Control|Control/g, '\u2303')
    .replace(/Right Shift|Left Shift|Shift/g, '\u21e7')
    .replace(/Right Super|Left Super|Super/g, '\u2295')
}

export function shortcutSegments(label: string): string[] {
  return label.split(' + ').map((segment) => glyph(segment))
}

export function prettyShortcut(label: string): string {
  return shortcutSegments(label).join(' ')
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}
