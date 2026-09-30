import { EventEmitter } from 'node:events'
import { globalShortcut, systemPreferences } from 'electron'
import { uIOhook, UiohookKey, type UiohookKeyboardEvent } from 'uiohook-napi'
import type { ShortcutBinding } from '../shared/types'

const MODIFIER_KEYCODES = new Set<number>([
  UiohookKey.Ctrl,
  UiohookKey.CtrlRight,
  UiohookKey.Alt,
  UiohookKey.AltRight,
  UiohookKey.Shift,
  UiohookKey.ShiftRight,
  UiohookKey.Meta,
  UiohookKey.MetaRight
])

const KEY_NAMES = new Map<number, string>()
for (const [name, code] of Object.entries(UiohookKey)) {
  if (typeof code !== 'number') continue
  if (MODIFIER_KEYCODES.has(code)) continue
  if (!KEY_NAMES.has(code)) KEY_NAMES.set(code, name)
}

const isMac = process.platform === 'darwin'

function modifierName(which: 'ctrl' | 'alt' | 'shift' | 'meta', right = false): string {
  switch (which) {
    case 'ctrl':
      return isMac ? (right ? 'Right Control' : 'Control') : right ? 'Right Ctrl' : 'Ctrl'
    case 'alt':
      return isMac ? (right ? 'Right Option' : 'Option') : right ? 'Right Alt' : 'Alt'
    case 'shift':
      return right ? 'Right Shift' : 'Shift'
    case 'meta':
      return isMac ? (right ? 'Right Command' : 'Command') : right ? 'Right Super' : 'Super'
  }
}

export function describeKey(keycode: number): string {
  if (keycode === UiohookKey.Ctrl) return modifierName('ctrl')
  if (keycode === UiohookKey.CtrlRight) return modifierName('ctrl', true)
  if (keycode === UiohookKey.Alt) return modifierName('alt')
  if (keycode === UiohookKey.AltRight) return modifierName('alt', true)
  if (keycode === UiohookKey.Shift) return modifierName('shift')
  if (keycode === UiohookKey.ShiftRight) return modifierName('shift', true)
  if (keycode === UiohookKey.Meta) return modifierName('meta')
  if (keycode === UiohookKey.MetaRight) return modifierName('meta', true)
  return KEY_NAMES.get(keycode) ?? `Key ${keycode}`
}

export function describeBinding(binding: ShortcutBinding): string {
  if (binding.keycode === null) return 'Unset'
  const parts: string[] = []
  if (binding.ctrl) parts.push(modifierName('ctrl'))
  if (binding.alt) parts.push(modifierName('alt'))
  if (binding.shift) parts.push(modifierName('shift'))
  if (binding.meta) parts.push(modifierName('meta'))
  parts.push(describeKey(binding.keycode))
  return parts.join(' + ')
}

interface ShortcutEvents {
  down: []
  up: []
  captured: [ShortcutBinding]
}

export class ShortcutManager extends EventEmitter<ShortcutEvents> {
  private binding: ShortcutBinding | null = null
  private capturing = false
  private held = false
  private started = false
  private fallbackAccelerator: string | null = null

  constructor(private onChange: (binding: ShortcutBinding, persist: boolean) => void) {
    super()
  }

  get isCapturing(): boolean {
    return this.capturing
  }

  start(): void {
    if (this.started) return
    try {
      uIOhook.on('keydown', this.onKeyDown)
      uIOhook.on('keyup', this.onKeyUp)
      uIOhook.start()
      this.started = true
      if (isMac && systemPreferences.isTrustedAccessibilityClient(false) === false) {
        // Prompt once; the key listener needs accessibility on macOS.
        systemPreferences.isTrustedAccessibilityClient(true)
      }
    } catch (err) {
      console.error('[buddy] uiohook unavailable, falling back to globalShortcut', err)
    }
  }

  stop(): void {
    if (!this.started) return
    try {
      uIOhook.off('keydown', this.onKeyDown)
      uIOhook.off('keyup', this.onKeyUp)
      uIOhook.stop()
    } catch {
      /* ignore */
    }
    this.started = false
  }

  get usingFallback(): boolean {
    return !this.started
  }

  setBinding(binding: ShortcutBinding): void {
    this.binding = binding
    this.reregisterFallback()
  }

  beginCapture(): void {
    this.capturing = true
  }

  cancelCapture(): void {
    this.capturing = false
  }

  private onKeyDown = (event: UiohookKeyboardEvent): void => {
    if (this.capturing) {
      const binding: ShortcutBinding = {
        keycode: event.keycode,
        label: '',
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      }
      // If the captured key is itself a modifier, drop that flag.
      if (MODIFIER_KEYCODES.has(event.keycode)) {
        if (event.keycode === UiohookKey.Ctrl || event.keycode === UiohookKey.CtrlRight) binding.ctrl = false
        if (event.keycode === UiohookKey.Alt || event.keycode === UiohookKey.AltRight) binding.alt = false
        if (event.keycode === UiohookKey.Shift || event.keycode === UiohookKey.ShiftRight) binding.shift = false
        if (event.keycode === UiohookKey.Meta || event.keycode === UiohookKey.MetaRight) binding.meta = false
      }
      binding.label = describeBinding(binding)
      this.capturing = false
      this.emit('captured', binding)
      return
    }
    if (this.held) return
    if (this.matches(event)) {
      this.held = true
      this.emit('down')
    }
  }

  private onKeyUp = (event: UiohookKeyboardEvent): void => {
    const binding = this.binding
    if (!binding || binding.keycode === null) return
    if (event.keycode === binding.keycode && this.held) {
      this.held = false
      this.emit('up')
    }
  }

  private matches(event: UiohookKeyboardEvent): boolean {
    const binding = this.binding
    if (!binding || binding.keycode === null) return false
    if (event.keycode !== binding.keycode) return false
    if (MODIFIER_KEYCODES.has(binding.keycode)) return true
    return (
      event.ctrlKey === binding.ctrl &&
      event.altKey === binding.alt &&
      event.shiftKey === binding.shift &&
      event.metaKey === binding.meta
    )
  }

  /** When uiohook is unavailable, use Electron's globalShortcut for a toggle. */
  private reregisterFallback(): void {
    if (this.started) return
    if (this.fallbackAccelerator) {
      globalShortcut.unregister(this.fallbackAccelerator)
      this.fallbackAccelerator = null
    }
    const accelerator = 'CommandOrControl+Shift+Space'
    try {
      globalShortcut.register(accelerator, () => {
        if (this.held) {
          this.held = false
          this.emit('up')
        } else {
          this.held = true
          this.emit('down')
        }
      })
      this.fallbackAccelerator = accelerator
      this.onChange(
        { keycode: null, label: 'Ctrl + Shift + Space', ctrl: false, alt: false, shift: false, meta: false },
        false
      )
    } catch {
      /* ignore */
    }
  }
}
