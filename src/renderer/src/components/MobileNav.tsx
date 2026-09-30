import { useBuddy } from '../lib/store'
import { NAV } from './nav'
import { cn } from '../lib/cn'

export function MobileNav(): React.JSX.Element {
  const page = useBuddy((s) => s.page)
  const setPage = useBuddy((s) => s.setPage)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-[color-mix(in_oklab,var(--canvas)_92%,transparent)] backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV.map((item) => {
        const active = item.id === page
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-medium',
              'transition-colors duration-[var(--dur-quick)]',
              active ? 'text-accent-text' : 'text-muted'
            )}
          >
            {active ? (
              <span className="absolute top-0 h-[2px] w-9 rounded-full bg-accent" />
            ) : null}
            <Icon size={20} />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
