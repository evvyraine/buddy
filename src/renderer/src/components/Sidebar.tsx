import { motion } from 'motion/react'
import { RiArrowLeftDoubleLine, RiArrowRightDoubleLine } from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { NAV } from './nav'
import { IconButton, Kbd } from './ui/primitives'
import { Tooltip } from './ui/Tooltip'
import { cn } from '../lib/cn'
import { prettyShortcut } from '../lib/format'

export function Sidebar({
  collapsed,
  onToggle
}: {
  collapsed: boolean
  onToggle: () => void
}): React.JSX.Element {
  const page = useBuddy((s) => s.page)
  const setPage = useBuddy((s) => s.setPage)
  const state = useBuddy((s) => s.state)
  const config = useBuddy((s) => s.config)

  const transcriber = state?.transcriberRunning || (state?.queueDepth ?? 0) > 0

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-canvas md:flex',
        'transition-[width] duration-[var(--dur-medium)] [transition-timing-function:var(--ease-out)]',
        collapsed ? 'w-[64px]' : 'w-[232px]'
      )}
    >
      <nav className={cn('flex flex-col gap-1 p-2', collapsed && 'items-center')}>
        {NAV.map((item) => {
          const active = item.id === page
          const Icon = item.icon
          const button = (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group relative flex h-9 shrink-0 items-center rounded-[var(--r-md)] text-[13px]',
                'transition-[background-color,color] duration-[var(--dur-quick)] [transition-timing-function:var(--ease-out)]',
                'active:scale-[0.98]',
                collapsed ? 'w-9 justify-center' : 'w-full gap-2.5 px-2.5',
                active ? 'text-ink' : 'text-muted hover:bg-sunken hover:text-ink'
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-[var(--r-md)] bg-accent-soft"
                  transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
                />
              ) : null}
              <Icon size={18} className={cn('shrink-0', active && 'text-accent-text')} />
              {!collapsed ? <span className="font-medium">{item.label}</span> : null}
            </button>
          )
          return collapsed ? (
            <Tooltip key={item.id} label={item.label}>
              {button}
            </Tooltip>
          ) : (
            button
          )
        })}
      </nav>

      <div className={cn('mt-auto flex flex-col gap-2 p-2', collapsed && 'items-center')}>
        {collapsed ? (
          <Tooltip
            label={
              state?.recording ? 'Recording' : transcriber ? 'Transcribing' : 'Ready'
            }
          >
            <div className="grid h-9 w-9 place-items-center rounded-[var(--r-md)] border border-line bg-surface">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  state?.recording ? 'rec-dot bg-accent' : transcriber ? 'bg-[var(--info-fg)]' : 'bg-faint'
                )}
              />
            </div>
          </Tooltip>
        ) : (
          <div className="rounded-[var(--r-lg)] border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <span
                className={cn('h-1.5 w-1.5 rounded-full', state?.recording ? 'rec-dot bg-accent' : 'bg-faint')}
              />
              <span className="mono text-[10.5px] tracking-[0.14em] text-faint uppercase">
                {state?.recording ? 'Recording' : transcriber ? 'Transcribing' : 'Ready'}
              </span>
            </div>
            <div className="mt-2 truncate text-[12px] text-muted" title={state?.deviceLabel ?? undefined}>
              {state?.deviceLabel ?? 'System default mic'}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="mono text-[11px] text-faint">
                {state?.shortcutFallback || state?.mode === 'toggle' ? 'toggle' : 'hold'}
              </span>
              <Kbd className="h-5 max-w-[120px] overflow-hidden text-[10px]">
                {prettyShortcut(state?.shortcutLabel ?? '—')}
              </Kbd>
            </div>
          </div>
        )}

        {!collapsed ? (
          <div className="mono px-1 text-[11.5px] text-faint">
            {config?.transcription.provider === 'none'
              ? 'Transcription off'
              : `Transcription · ${config?.transcription.provider}`}
          </div>
        ) : null}

        {collapsed ? (
          <Tooltip label="Expand sidebar">
            <IconButton label="Expand sidebar" onClick={onToggle}>
              <RiArrowRightDoubleLine size={16} />
            </IconButton>
          </Tooltip>
        ) : (
          <button
            onClick={onToggle}
            className="flex h-8 items-center gap-2 rounded-[var(--r-md)] px-2 text-[12px] text-faint transition-colors hover:bg-sunken hover:text-ink"
          >
            <RiArrowLeftDoubleLine size={15} />
            Collapse
          </button>
        )}
      </div>
    </aside>
  )
}
