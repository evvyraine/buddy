import { useEffect, useState } from 'react'
import {
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiFileTextLine,
  RiFolderOpenLine,
  RiMicLine,
  RiRecordCircleFill,
  RiSoundModuleLine,
  RiStopCircleFill
} from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { toggleRecording } from '../lib/recorderController'
import { Waveform } from '../components/Waveform'
import { Badge, Button, Kbd, SectionLabel } from '../components/ui/primitives'
import { formatBytes, formatDuration, formatTimer, prettyShortcut, timeAgo } from '../lib/format'
import { cn } from '../lib/cn'
import type { RecordingMeta } from '../../../shared/types'

function useElapsed(startedAt: number | null, recording: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!recording) return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [recording])
  return recording && startedAt ? now - startedAt : 0
}

function Chip({
  icon,
  children,
  className
}: {
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'mono inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[11.5px] whitespace-nowrap text-muted',
        className
      )}
    >
      <span className="shrink-0 text-faint [&>svg]:block">{icon}</span>
      {children}
    </span>
  )
}

export function RecordPage(): React.JSX.Element {
  const state = useBuddy((s) => s.state)
  const config = useBuddy((s) => s.config)
  const recordings = useBuddy((s) => s.recordings)
  const libraryLoading = useBuddy((s) => s.libraryLoading)
  const setPage = useBuddy((s) => s.setPage)

  const recording = state?.recording ?? false
  const elapsed = useElapsed(state?.startedAt ?? null, recording)
  const recent = recordings.slice(0, 6)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:gap-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Chip icon={<RiMicLine size={13} />}>{state?.deviceLabel ?? 'System default mic'}</Chip>
        <Chip icon={<RiSoundModuleLine size={13} />} className="hidden sm:inline-flex">
          {config?.format.toUpperCase() ?? 'WAV'}
        </Chip>
        <Chip icon={<RiFolderOpenLine size={13} />} className="hidden sm:inline-flex">
          {config?.outputDir.split(/[\\/]/).slice(-2).join('/') ?? ''}
        </Chip>
        <Chip icon={<RiFileTextLine size={13} />} className="hidden lg:inline-flex">
          {config?.transcription.provider === 'none' ? 'no transcription' : config?.transcription.provider}
        </Chip>
        <button
          onClick={() => setPage('settings')}
          className="mono ml-auto inline-flex h-7 items-center gap-0.5 text-[11.5px] text-accent-text hover:underline"
        >
          Configure <RiArrowRightSLine size={14} />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr] lg:gap-5">
        <section className="relative flex min-h-[360px] flex-col overflow-hidden rounded-[var(--r-xl)] border border-line bg-surface lg:min-h-0">
          <div className="flex items-center justify-between px-4 pt-4 sm:px-5 sm:pt-5">
            <SectionLabel>{recording ? 'Capturing' : 'Push to talk'}</SectionLabel>
            {recording ? (
              <span className="mono flex items-center gap-1.5 text-[11px] text-accent-text">
                <span className="rec-dot h-1.5 w-1.5 rounded-full bg-accent" /> live
              </span>
            ) : (
              <span className="mono text-[11px] text-faint">idle</span>
            )}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-6 sm:gap-6 sm:px-6">
            <div className="w-full max-w-[520px]">
              <Waveform level={state?.level ?? 0} active={recording} height={96} bars={56} />
            </div>

            <div
              className={cn(
                'mono tnum text-[38px] leading-none tracking-tight transition-colors duration-200 sm:text-[46px]',
                recording ? 'text-ink' : 'text-faint'
              )}
            >
              {recording ? formatTimer(elapsed) : <span className="text-[30px]">00:00.0</span>}
            </div>

            <button
              onClick={() => void toggleRecording()}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              className={cn(
                'grid h-[88px] w-[88px] place-items-center rounded-[28px] border',
                'transition-[background-color,border-color,box-shadow,scale] duration-[var(--dur-quick)]',
                '[transition-timing-function:var(--ease-out)] active:scale-[0.96]',
                recording
                  ? 'border-transparent bg-accent-fill text-accent-contrast shadow-[0_0_0_8px_var(--accent-soft)]'
                  : 'border-line bg-surface text-accent-text hover:border-line-strong'
              )}
            >
              {recording ? (
                <RiStopCircleFill size={32} />
              ) : (
                <RiRecordCircleFill size={34} />
              )}
            </button>

            <div className="flex flex-wrap items-center justify-center gap-2 text-center text-[12.5px] text-muted">
              {recording ? (
                <span className="swap">
                  {state?.mode === 'toggle' || state?.shortcutFallback
                    ? 'Press again, or click to save'
                    : 'Release the key to save'}
                </span>
              ) : state?.mode === 'hold' && !state?.shortcutFallback ? (
                <>
                  <span>Hold</span>
                  <Kbd>{prettyShortcut(state?.shortcutLabel ?? '—')}</Kbd>
                  <span>anywhere, or click to record</span>
                </>
              ) : (
                <>
                  <span>Press</span>
                  <Kbd>{prettyShortcut(state?.shortcutLabel ?? '—')}</Kbd>
                  <span>to start, or click to record</span>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="flex min-h-0 flex-col gap-4 sm:gap-5">
          <section className="rounded-[var(--r-xl)] border border-line bg-surface p-4">
            <SectionLabel>Last save</SectionLabel>
            {state?.lastSaved ? (
              <div className="mt-2.5 flex items-start gap-2.5">
                <RiCheckboxCircleLine size={18} className="mt-0.5 shrink-0 text-[var(--ok-fg)]" />
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12.5px] text-ink">{state.lastSaved.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-faint">
                    {formatDuration(state.lastSaved.durationMs)} · {formatBytes(state.lastSaved.sizeBytes)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[12.5px] text-faint">Nothing yet — hold the key and speak.</p>
            )}
            {state && state.queueDepth > 0 ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <span className="shimmer-text font-mono text-[11.5px]">
                  transcribing {state.queueDepth}…
                </span>
              </div>
            ) : null}
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-[var(--r-xl)] border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <SectionLabel>Recent</SectionLabel>
              <button
                onClick={() => setPage('library')}
                className="mono text-[11px] text-accent-text hover:underline"
              >
                all
              </button>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto pr-1">
              {libraryLoading ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="skeleton h-3.5 w-2/3" />
                      <div className="skeleton h-2.5 w-1/3" />
                    </div>
                  ))}
                </>
              ) : recent.length === 0 ? (
                <p className="text-[12.5px] text-faint">Recordings will appear here.</p>
              ) : (
                recent.map((item) => <RecentItem key={item.id} item={item} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function RecentItem({ item }: { item: RecordingMeta }): React.JSX.Element {
  return (
    <div className="rounded-[var(--r-md)] border border-transparent px-2 py-1.5 transition-colors hover:bg-elevated">
      <div className="flex items-center gap-2">
        <span className="truncate font-mono text-[12px] text-ink">{item.name}</span>
        <span className="ml-auto shrink-0 text-[11px] text-faint">{timeAgo(item.createdAt)}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="mono text-[10.5px] text-faint">{formatDuration(item.durationMs)}</span>
        {item.transcript ? (
          <span className="truncate text-[11.5px] text-muted">{item.transcript}</span>
        ) : item.transcriptStatus === 'pending' ? (
          <Badge tone="quiet">transcribing</Badge>
        ) : (
          <span className="text-[11.5px] text-faint">no transcript</span>
        )}
      </div>
    </div>
  )
}
