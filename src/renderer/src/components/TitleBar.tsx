import {
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiCloseLine,
  RiMoonLine,
  RiSubtractLine,
  RiSunLine
} from '@remixicon/react'
import { Logo } from './Logo'
import { useBuddy } from '../lib/store'
import { IconButton } from './ui/primitives'
import { Tooltip } from './ui/Tooltip'
import { cn } from '../lib/cn'

const PAGE_LABEL: Record<string, string> = {
  record: 'Record',
  library: 'Library',
  settings: 'Settings',
  about: 'About'
}

const isMac = navigator.userAgent.includes('Mac')

export function TitleBar({
  collapsed,
  onToggleSidebar,
  showSidebarToggle
}: {
  collapsed: boolean
  onToggleSidebar: () => void
  showSidebarToggle: boolean
}): React.JSX.Element {
  const page = useBuddy((s) => s.page)
  const config = useBuddy((s) => s.config)
  const patchConfig = useBuddy((s) => s.patchConfig)

  const toggleTheme = (): void => {
    void patchConfig({ theme: config?.theme === 'dark' ? 'light' : 'dark' })
  }

  return (
    <header
      className="flex h-11 shrink-0 items-center gap-2 border-b border-line pr-2"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className={cn('flex items-center gap-2.5', isMac ? 'pl-[92px]' : 'pl-3')}>
        <Logo size={20} />
        <span className="mono text-[13px] font-medium tracking-tight whitespace-nowrap text-ink">
          Buddy
        </span>
        <span className="hidden text-faint sm:inline">/</span>
        <span className="mono hidden text-[12px] whitespace-nowrap text-muted sm:inline">
          {PAGE_LABEL[page] ?? ''}
        </span>
      </div>

      <div className="flex-1" />

      <div
        className="no-drag flex items-center gap-0.5"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {showSidebarToggle ? (
          <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="bottom">
            <IconButton label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggleSidebar}>
              {collapsed ? <RiArrowRightDoubleLine size={16} /> : <RiArrowLeftDoubleLine size={16} />}
            </IconButton>
          </Tooltip>
        ) : null}

        <Tooltip label="Toggle theme" side="bottom">
          <IconButton label="Toggle theme" onClick={toggleTheme}>
            <span className="icon-swap" data-active={config?.theme === 'dark'}>
              <RiSunLine size={16} className="icon-in" />
              <RiMoonLine size={16} className="icon-out" />
            </span>
          </IconButton>
        </Tooltip>

        {!isMac ? (
          <>
            <IconButton label="Minimize" onClick={() => void window.buddy.window.minimize()}>
              <RiSubtractLine size={15} />
            </IconButton>
            <IconButton label="Close" onClick={() => void window.buddy.window.hide()}>
              <RiCloseLine size={15} />
            </IconButton>
          </>
        ) : null}
      </div>
    </header>
  )
}
