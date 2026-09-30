import { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useBuddy, type Page } from './lib/store'
import { initRecorder } from './lib/recorderController'
import { applyAppearance } from './lib/theme'
import { useMediaQuery } from './lib/useMediaQuery'
import { pageVariants } from './lib/motion'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { TooltipProvider } from './components/ui/Tooltip'
import { Toaster } from './components/ui/Toast'
import { RecordPage } from './pages/RecordPage'
import { LibraryPage } from './pages/LibraryPage'
import { SettingsPage } from './pages/SettingsPage'
import { AboutPage } from './pages/AboutPage'

const PAGES: Record<Page, () => React.JSX.Element> = {
  record: RecordPage,
  library: LibraryPage,
  settings: SettingsPage,
  about: AboutPage
}

const VALID_PAGES: Page[] = ['record', 'library', 'settings', 'about']

export function App(): React.JSX.Element {
  const config = useBuddy((s) => s.config)
  const page = useBuddy((s) => s.page)
  const setPage = useBuddy((s) => s.setPage)
  const setConfig = useBuddy((s) => s.setConfig)
  const patchConfig = useBuddy((s) => s.patchConfig)
  const setState = useBuddy((s) => s.setState)
  const setRecordings = useBuddy((s) => s.setRecordings)
  const setLibraryLoading = useBuddy((s) => s.setLibraryLoading)

  const reloadTimer = useRef<number | null>(null)
  const isNarrow = useMediaQuery('(max-width: 767px)')

  const reload = useCallback(async () => {
    const items = await window.buddy.library.list()
    setRecordings(items)
  }, [setRecordings])

  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current)
    reloadTimer.current = window.setTimeout(() => void reload(), 250)
  }, [reload])

  useEffect(() => {
    initRecorder(() => useBuddy.getState().config)
  }, [])

  useEffect(() => {
    void (async () => {
      const [cfg, recordings, snapshot] = await Promise.all([
        window.buddy.config.get(),
        window.buddy.library.list(),
        window.buddy.events.getState()
      ])
      setConfig(cfg)
      setRecordings(recordings)
      setState(snapshot)
      setLibraryLoading(false)
    })()
    const unsubscribeState = window.buddy.events.onState((next) => setState(next))
    return unsubscribeState
  }, [setConfig, setRecordings, setLibraryLoading, setState])

  useEffect(() => {
    const unsubscribers = [
      window.buddy.config.onChanged((cfg) => setConfig(cfg)),
      window.buddy.library.onChanged(scheduleReload),
      window.buddy.library.onSaved(({ meta }) => {
        const current = useBuddy.getState().recordings
        useBuddy.getState().setRecordings([meta, ...current.filter((item) => item.id !== meta.id)])
        scheduleReload()
      }),
      window.buddy.library.onTranscript((update) => {
        const current = useBuddy.getState().recordings
        if (!current.some((item) => item.path === update.path)) {
          scheduleReload()
          return
        }
        useBuddy.getState().setRecordings(
          current.map((item) =>
            item.path === update.path
              ? { ...item, transcript: update.text, transcriptStatus: update.status }
              : item
          )
        )
      }),
      window.buddy.events.onNavigate((target) => {
        if (VALID_PAGES.includes(target as Page)) setPage(target as Page)
      })
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [setConfig, setPage, scheduleReload])

  useEffect(() => {
    if (!config) return
    applyAppearance(config.theme, config.accent, config.animations)
  }, [config])

  useEffect(() => {
    if (config?.theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (): void => applyAppearance('system', config.accent, config.animations)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [config?.theme, config?.accent, config?.animations, config])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const map: Record<string, Page> = {
        '1': 'record',
        '2': 'library',
        '3': 'settings',
        '4': 'about'
      }
      if (map[event.key]) {
        event.preventDefault()
        setPage(map[event.key])
      } else if (event.key === ',') {
        event.preventDefault()
        setPage('settings')
      } else if (event.key === 'b') {
        event.preventDefault()
        void patchConfig({ sidebarCollapsed: !config?.sidebarCollapsed })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPage, patchConfig, config?.sidebarCollapsed])

  if (!config) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="skeleton h-8 w-8 rounded-[10px]" />
          <div className="skeleton h-2.5 w-24" />
        </div>
      </div>
    )
  }

  const collapsed = config.sidebarCollapsed
  const toggleSidebar = (): void => void patchConfig({ sidebarCollapsed: !collapsed })
  const PageComponent = PAGES[page]

  return (
    <TooltipProvider>
      <div className="root flex h-full flex-col bg-canvas">
        <TitleBar
          collapsed={collapsed}
          onToggleSidebar={toggleSidebar}
          showSidebarToggle={!isNarrow}
        />
        <div className="flex min-h-0 flex-1">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
          <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden pb-[62px] md:pb-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={page}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                <PageComponent />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <MobileNav />
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
