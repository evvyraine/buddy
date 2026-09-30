import '@fontsource-variable/onest'
import '@fontsource-variable/geist-mono'
import './styles/index.css'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'motion/react'
import type { OverlayState } from '../../shared/api'
import type { AppConfig } from '../../shared/types'
import { applyAppearance } from './lib/theme'
import { Waveform } from './components/Waveform'
import { formatTimer } from './lib/format'
import { cn } from './lib/cn'

function Overlay(): React.JSX.Element {
  const [state, setState] = useState<OverlayState | null>(null)
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    void window.buddy.config.get().then((cfg) => {
      setConfig(cfg)
      applyAppearance(cfg.theme, cfg.accent, cfg.animations)
    })
    const unsubState = window.buddy.events.onOverlayState(setState)
    const unsubConfig = window.buddy.config.onChanged((cfg) => {
      setConfig(cfg)
      applyAppearance(cfg.theme, cfg.accent, cfg.animations)
    })
    return () => {
      unsubState()
      unsubConfig()
    }
  }, [])

  const visible = Boolean(state?.visible)
  const recording = Boolean(state?.recording)

  return (
    <div className="grid h-full w-full place-items-center p-3">
      <AnimatePresence>
        {visible ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8, scale: 0.97, filter: 'blur(6px)' }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="glass flex h-full w-full items-center gap-4 rounded-[18px] px-5"
          >
            <div className="flex w-[128px] shrink-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    recording ? 'rec-dot bg-accent' : 'bg-[var(--warn-fg)]'
                  )}
                />
                <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  {recording ? 'Recording' : 'Saving'}
                </span>
              </div>
              <div className="mono tnum mt-1 text-[26px] leading-none tracking-tight text-ink">
                {recording ? formatTimer(state?.elapsedMs ?? 0) : '—'}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <Waveform
                level={state?.level ?? 0}
                active={recording}
                height={56}
                bars={40}
                gap={2}
              />
            </div>

            <div className="w-[132px] shrink-0 text-right">
              <div className="swap text-[12px] text-muted">{state?.hint ?? ''}</div>
              <div className="mt-0.5 truncate text-[11px] text-faint" title={state?.deviceLabel ?? undefined}>
                {state?.deviceLabel ?? config?.inputDeviceLabel ?? ''}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(<Overlay />)
