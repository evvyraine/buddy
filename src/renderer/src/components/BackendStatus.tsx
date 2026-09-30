import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiRefreshLine
} from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { Switch } from './ui/Switch'
import { Button } from './ui/primitives'
import { cn } from '../lib/cn'
import type { SetupProgress, TranscriptionCheck } from '../../../shared/types'

const PHASE_LABEL: Record<SetupProgress['phase'], string> = {
  prepare: 'Preparing',
  uv: 'Fetching tools',
  venv: 'Creating environment',
  install: 'Installing Whisper',
  verify: 'Verifying',
  model: 'Downloading model',
  done: 'Ready',
  error: 'Failed'
}

export function BackendStatus(): React.JSX.Element {
  const config = useBuddy((s) => s.config)
  const patchConfig = useBuddy((s) => s.patchConfig)
  const [check, setCheck] = useState<TranscriptionCheck | null>(null)
  const [progress, setProgress] = useState<SetupProgress | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setCheck(await window.buddy.transcription.check())
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh, config?.transcription.pythonPath])

  useEffect(() => {
    return window.buddy.transcription.onSetupProgress((next) => {
      setProgress(next)
      if (next.phase === 'done') {
        setBusy(false)
        void refresh()
      } else if (next.phase === 'error') {
        setBusy(false)
        void refresh()
      } else {
        setBusy(true)
      }
    })
  }, [refresh])

  const start = useCallback(async () => {
    setBusy(true)
    setProgress({ phase: 'prepare', message: 'Starting…', percent: 1 })
    await window.buddy.transcription.setup()
    setBusy(false)
    void refresh()
  }, [refresh])

  // Set it up without being asked, as long as the user wants a local backend.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current || busy || !check || check.ok) return
    if (!config?.transcription.autoSetup) return
    autoStarted.current = true
    void start()
  }, [busy, check, config?.transcription.autoSetup, start])

  const ready = Boolean(check?.ok)
  const failed = Boolean(check && !check.ok && !busy)

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-mono text-[13px] font-medium tracking-tight text-ink">Local backend</h2>
        <p className="mt-0.5 text-[12px] text-muted">
          Whisper runs on this machine. Buddy installs and maintains it for you.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--r-lg)] border border-line bg-surface p-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-6 w-6 shrink-0 place-items-center rounded-full [&>svg]:block',
              ready ? 'text-[var(--ok-fg)]' : failed ? 'text-[var(--err-fg)]' : 'text-accent-text'
            )}
          >
            {ready ? (
              <RiCheckboxCircleLine size={17} />
            ) : failed ? (
              <RiErrorWarningLine size={17} />
            ) : (
              <RiLoader4Line size={17} className="animate-spin" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-ink">
              {ready
                ? `Ready · ${check?.backend ?? 'whisper'}`
                : busy
                  ? PHASE_LABEL[progress?.phase ?? 'prepare']
                  : 'Setting up…'}
            </div>
            <div className="truncate text-[11.5px] text-muted" title={check?.python}>
              {busy ? (progress?.message ?? '') : failed ? check?.error : (check?.python ?? '')}
            </div>
          </div>
          {failed ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<RiRefreshLine size={14} />}
              className="shrink-0"
              onClick={() => void start()}
            >
              Retry
            </Button>
          ) : null}
        </div>

        {busy ? (
          <div className="flex flex-col gap-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(4, progress?.percent ?? 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-faint">
                This runs once, and can take a few minutes.
              </span>
              <button
                onClick={() => void window.buddy.transcription.cancelSetup()}
                className="mono text-[11px] text-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
          <div className="min-w-0">
            <div className="text-[13px] text-ink">Set up automatically</div>
            <div className="mt-0.5 text-[12px] text-muted">
              Install and update the local backend without asking.
            </div>
          </div>
          <Switch
            label="Set up automatically"
            checked={config?.transcription.autoSetup ?? true}
            onChange={(value) => void patchConfig({ transcription: { autoSetup: value } })}
          />
        </div>
      </div>
    </section>
  )
}
