import type { BuddyApi } from '../shared/api'

declare global {
  interface Window {
    buddy: BuddyApi
  }
}

export {}
