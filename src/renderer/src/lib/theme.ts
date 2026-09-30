import type { AccentName, ThemeMode } from '../../../shared/types'

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

let suppressStyle: HTMLStyleElement | null = null

function withoutTransitions(mutate: () => void): void {
  if (!suppressStyle) {
    suppressStyle = document.createElement('style')
    suppressStyle.textContent =
      '*,*::before,*::after{transition:none !important;animation:none !important}'
  }
  document.head.appendChild(suppressStyle)
  mutate()
  // Force a reflow so the suppressed styles take effect before transitions resume.
  void document.documentElement.offsetHeight
  requestAnimationFrame(() => {
    if (suppressStyle && suppressStyle.parentNode) suppressStyle.parentNode.removeChild(suppressStyle)
  })
}

export function applyAppearance(theme: ThemeMode, accent: AccentName, animations: boolean): void {
  const root = document.documentElement
  const nextTheme = resolveTheme(theme)

  const changed =
    root.dataset.theme !== nextTheme || root.dataset.accent !== accent

  const mutate = (): void => {
    root.dataset.theme = nextTheme
    root.dataset.accent = accent
    root.dataset.motion = animations ? 'on' : 'off'
  }

  if (changed) withoutTransitions(mutate)
  else mutate()
}
