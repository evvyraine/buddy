import { RiFileMusicLine, RiInformationLine, RiMicLine, RiSettings3Line } from '@remixicon/react'
import type { Page } from '../lib/store'

export const NAV: Array<{ id: Page; label: string; icon: typeof RiMicLine }> = [
  { id: 'record', label: 'Record', icon: RiMicLine },
  { id: 'library', label: 'Library', icon: RiFileMusicLine },
  { id: 'settings', label: 'Settings', icon: RiSettings3Line },
  { id: 'about', label: 'About', icon: RiInformationLine }
]
