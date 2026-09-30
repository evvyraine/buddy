import { useEffect, useState } from 'react'
import { RiCloseLine, RiKeyboardLine } from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { Button, Kbd } from './ui/primitives'
import { shortcutSegments } from '../lib/format'
import { cn } from '../lib/cn'

export function ShortcutRecorder(): React.JSX.Element {
  const config = useBuddy((s) => s.config)
  const patchConfig = useBuddy((s) => s.patchConfig)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    return window.buddy.shortcut.onCaptured((binding) => {
      void patchConfig({ shortcut: binding })
      setCapturing(false)
    })
  }, [patchConfig])

  const begin = async (): Promise<void> => {
    setCapturing(true)
    await window.buddy.shortcut.beginCapture()
  }

  const cancel = async (): Promise<void> => {
    setCapturing(false)
    await window.buddy.shortcut.cancelCapture()
  }

  const label = config?.shortcut.label ?? 'Unset'

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={cn(
          'flex min-h-[52px] items-center gap-3 rounded-[var(--r-md)] border border-dashed px-3 py-2.5',
          'transition-colors duration-[var(--dur-quick)]',
          capturing ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
        )}
      >
        {capturing ? (
          <span className="shimmer-text font-mono text-[13px]">Press any key combination…</span>
        ) : label === 'Unset' ? (
          <span className="text-[13px] text-faint">No shortcut set</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1">
            {shortcutSegments(label).map((segment, index) => (
              <Kbd key={`${segment}-${index}`} className="h-6 px-2 text-[11px]">
                {segment}
              </Kbd>
            ))}
          </span>
        )}
        <span className="flex-1" />
        {capturing ? (
          <Button size="sm" variant="ghost" icon={<RiCloseLine size={14} />} onClick={cancel}>
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            icon={<RiKeyboardLine size={15} />}
            onClick={begin}
          >
            Record
          </Button>
        )}
      </div>
      <p className="text-[12px] leading-snug text-faint">
        Hold this key anywhere to record. A single modifier such as Right Option works well because it
        never types a character.
      </p>
    </div>
  )
}
