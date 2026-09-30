import { useMemo, useState } from 'react'
import {
  RiDeleteBinLine,
  RiFileCopyLine,
  RiFolderOpenLine,
  RiMoreLine,
  RiPauseFill,
  RiPlayFill,
  RiRefreshLine,
  RiSearchLine,
  RiSoundModuleLine,
  RiCloseLine
} from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { useAudioPlayer } from '../lib/useAudioPlayer'
import { Badge, Button, IconButton } from '../components/ui/primitives'
import { ActionMenu } from '../components/ui/Menu'
import { ConfirmDialog } from '../components/ui/Dialog'
import { TextInput } from '../components/ui/Field'
import { cn } from '../lib/cn'
import { formatBytes, formatDateTime, formatDuration } from '../lib/format'
import type { RecordingMeta } from '../../../shared/types'

export function LibraryPage(): React.JSX.Element {
  const recordings = useBuddy((s) => s.recordings)
  const loading = useBuddy((s) => s.libraryLoading)
  const setPage = useBuddy((s) => s.setPage)
  const player = useAudioPlayer()
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<RecordingMeta | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recordings
    return recordings.filter(
      (item) =>
        item.name.toLowerCase().includes(q) || (item.transcript ?? '').toLowerCase().includes(q)
    )
  }, [recordings, query])

  const totalSize = useMemo(() => recordings.reduce((sum, item) => sum + item.sizeBytes, 0), [recordings])

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return
    if (player.currentPath === pendingDelete.path) player.stop()
    await window.buddy.library.remove(pendingDelete.path)
    setPendingDelete(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end gap-3 px-4 pt-5 pb-3 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h1 className="text-[15px] text-ink">Library</h1>
          <p className="mt-0.5 text-[12px] text-muted">
            {recordings.length} recording{recordings.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
          </p>
        </div>

        <div className="relative ml-auto w-full min-w-[180px] sm:w-[280px]">
          <RiSearchLine
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint"
          />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names and transcripts"
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[6px] text-faint transition-colors hover:bg-sunken hover:text-ink [&>svg]:block"
            >
              <RiCloseLine size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 sm:px-6">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-[var(--r-lg)] border border-line bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-9 w-9 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="skeleton h-3 w-1/3" />
                    <div className="skeleton h-2.5 w-1/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyLibrary hasItems={recordings.length > 0} onRecord={() => setPage('record')} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((item) => (
              <RecordingRow
                key={item.id}
                item={item}
                playing={player.currentPath === item.path && player.playing}
                active={player.currentPath === item.path}
                progress={player.currentPath === item.path ? player.progress : 0}
                onToggle={() => player.toggle(item.path)}
                onDelete={() => setPendingDelete(item)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete recording"
        tone="danger"
        confirmLabel="Delete"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" and its transcript will be removed from disk. This cannot be undone.`
            : undefined
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function RecordingRow({
  item,
  playing,
  active,
  progress,
  onToggle,
  onDelete
}: {
  item: RecordingMeta
  playing: boolean
  active: boolean
  progress: number
  onToggle: () => void
  onDelete: () => void
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [retranscribing, setRetranscribing] = useState(false)
  const long = (item.transcript?.length ?? 0) > 180

  const retranscribe = async (): Promise<void> => {
    setRetranscribing(true)
    await window.buddy.library.transcribe(item.path)
    setRetranscribing(false)
  }

  return (
    <div className="lift relative overflow-hidden rounded-[var(--r-lg)] border border-line bg-surface">
      <div className="flex items-center gap-3 p-3 sm:p-3.5">
        <button
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full border',
            'transition-[background-color,color,border-color,scale] duration-[var(--dur-quick)] active:scale-[0.96]',
            playing
              ? 'border-transparent bg-accent-fill text-accent-contrast'
              : 'border-line bg-surface text-ink hover:border-line-strong'
          )}
        >
          {playing ? <RiPauseFill size={15} /> : <RiPlayFill size={15} className="pl-px" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[12.5px] text-ink">{item.name}</span>
            {item.transcript ? <Badge tone="accent">transcript</Badge> : null}
          </div>
          <div className="mono mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
            <span>{formatDuration(item.durationMs)}</span>
            <span aria-hidden>·</span>
            <span>{formatBytes(item.sizeBytes)}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">{formatDateTime(item.createdAt)}</span>
          </div>
        </div>

        <ActionMenu
          label="Recording actions"
          trigger={
            <IconButton label="Recording actions">
              <RiMoreLine size={16} />
            </IconButton>
          }
          actions={[
            ...(item.transcript
              ? [
                  {
                    label: 'Copy transcript',
                    icon: <RiFileCopyLine size={15} />,
                    onSelect: () => void window.buddy.clipboard.write(item.transcript ?? '')
                  }
                ]
              : []),
            {
              label: retranscribing ? 'Transcribing…' : 'Transcribe',
              icon: <RiRefreshLine size={15} />,
              onSelect: () => void retranscribe(),
              disabled: retranscribing
            },
            {
              label: 'Show in folder',
              icon: <RiFolderOpenLine size={15} />,
              onSelect: () => void window.buddy.library.reveal(item.path)
            },
            {
              label: 'Delete',
              icon: <RiDeleteBinLine size={15} />,
              onSelect: onDelete,
              danger: true
            }
          ]}
        />
      </div>

      {item.transcript ? (
        <div className="border-t border-line px-3.5 py-2.5 sm:px-3.5">
          <p
            className={cn(
              'cursor-default text-[12.5px] leading-relaxed text-muted',
              !expanded && long && 'line-clamp-2'
            )}
          >
            {item.transcript}
          </p>
          {long ? (
            <button
              onClick={() => setExpanded((value) => !value)}
              className="mono mt-1 text-[11px] text-accent-text hover:underline"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <div className="absolute right-0 bottom-0 left-0 h-[2px] bg-sunken">
          <div
            className="h-full bg-accent transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  )
}

function EmptyLibrary({
  hasItems,
  onRecord
}: {
  hasItems: boolean
  onRecord: () => void
}): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-[var(--r-xl)] border border-line bg-surface">
        <RiSoundModuleLine size={26} className="text-faint" />
      </div>
      <div className="px-4">
        <h3 className="text-[14px] text-ink">{hasItems ? 'Nothing matches' : 'No recordings yet'}</h3>
        <p className="mx-auto mt-1 max-w-[280px] text-[12.5px] leading-relaxed text-muted">
          {hasItems
            ? 'Try a different name or clear the search to see everything.'
            : 'Hold your push-to-talk key anywhere on the system and your first recording lands here.'}
        </p>
      </div>
      {!hasItems ? (
        <Button variant="primary" onClick={onRecord}>
          Go to Record
        </Button>
      ) : null}
    </div>
  )
}
