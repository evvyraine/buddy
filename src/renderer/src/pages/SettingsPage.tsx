import { useEffect, useState, type ReactNode } from 'react'
import {
  RiExternalLinkLine,
  RiCheckLine,
  RiClipboardLine,
  RiComputerLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiFolderOpenLine,
  RiKeyboardLine,
  RiLockLine,
  RiMicLine,
  RiPaletteLine,
  RiRestartLine,
} from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { ShortcutRecorder } from '../components/ShortcutRecorder'
import { BackendStatus } from '../components/BackendStatus'
import { Tabs, TabList, Tab, TabIndicator, TabPanel } from '../components/ui/Tabs'
import { Segmented } from '../components/ui/Segmented'
import { Switch } from '../components/ui/Switch'
import { Select } from '../components/ui/Select'
import { NumberField } from '../components/ui/NumberField'
import { Field, TextInput, controlClass } from '../components/ui/Field'
import { Button } from '../components/ui/primitives'
import { cn } from '../lib/cn'
import type {
  AccentName,
  AudioFormat,
  DeviceOption,
  PasteAction,
  ThemeMode,
  TranscriptionProvider
} from '../../../shared/types'
import type { SystemInfo } from '../../../shared/api'

const ACCENTS: Array<{ id: AccentName; color: string; label: string }> = [
  { id: 'pink', color: '#e8558f', label: 'Pink' },
  { id: 'rose', color: '#e24a63', label: 'Rose' },
  { id: 'magenta', color: '#c247d6', label: 'Magenta' },
  { id: 'violet', color: '#8b6cf6', label: 'Violet' },
  { id: 'amber', color: '#d08a16', label: 'Amber' },
  { id: 'emerald', color: '#18a97a', label: 'Emerald' },
  { id: 'sky', color: '#2e93db', label: 'Sky' }
]

async function listDevices(): Promise<DeviceOption[]> {
  let devices = await navigator.mediaDevices.enumerateDevices()
  let inputs = devices.filter((device) => device.kind === 'audioinput')
  if (inputs.every((device) => !device.label)) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      devices = await navigator.mediaDevices.enumerateDevices()
      inputs = devices.filter((device) => device.kind === 'audioinput')
    } catch {
      /* permission declined */
    }
  }
  const options = inputs
    .filter((device) => device.deviceId && device.deviceId !== 'default')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
      isDefault: false
    }))
  return [{ deviceId: '', label: 'System default', isDefault: true }, ...options]
}

function Section({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-mono text-[13px] font-medium tracking-tight text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
      </div>
      <div className="flex flex-col divide-y divide-line rounded-[var(--r-lg)] border border-line bg-surface">
        {children}
      </div>
    </section>
  )
}

function Row({
  title,
  description,
  children
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[13px] text-ink">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[12px] leading-snug text-muted">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Pane({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-4 py-5 sm:px-6 sm:py-6">
      {children}
    </div>
  )
}

export function SettingsPage(): React.JSX.Element {
  const config = useBuddy((s) => s.config)
  const patch = useBuddy((s) => s.patchConfig)
  const [tab, setTab] = useState('shortcut')
  const [devices, setDevices] = useState<DeviceOption[]>([])
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    void listDevices().then(setDevices)
    void window.buddy.system.info().then(setInfo)
  }, [])

  if (!config) return <div className="p-6 text-muted">Loading…</div>

  const t = config.transcription

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <Tab value="shortcut" icon={<RiKeyboardLine size={16} />}>
            Shortcut
          </Tab>
          <Tab value="appearance" icon={<RiPaletteLine size={16} />}>
            Appearance
          </Tab>
          <Tab value="audio" icon={<RiMicLine size={16} />}>
            Audio
          </Tab>
          <Tab value="transcription" icon={<RiFileTextLine size={16} />}>
            Transcription
          </Tab>
          <Tab value="delivery" icon={<RiClipboardLine size={16} />}>
            Delivery
          </Tab>
          <Tab value="system" icon={<RiComputerLine size={16} />}>
            System
          </Tab>
          <TabIndicator />
        </TabList>

        <TabPanel value="shortcut">
          <Pane>
            <Section title="Push to talk" description="How a recording starts and stops.">
              <div className="p-3.5">
                <ShortcutRecorder />
              </div>
              <Row
                title="Trigger"
                description="Hold the key while speaking, or press it once to start and once to stop."
              >
                <Segmented
                  label="Trigger"
                  value={config.triggerMode}
                  onChange={(value) => void patch({ triggerMode: value })}
                  options={[
                    { value: 'hold', label: 'Hold' },
                    { value: 'toggle', label: 'Toggle' }
                  ]}
                />
              </Row>
            </Section>

            {info?.usingFallbackShortcut ? (
              <div className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-line bg-elevated p-3">
                <RiErrorWarningLine size={16} className="mt-0.5 shrink-0 text-[var(--warn-fg)]" />
                <p className="flex-1 text-[12px] leading-relaxed text-muted">
                  Hold-to-talk needs Accessibility permission. Until it is granted, Buddy falls back to
                  Ctrl + Shift + Space as a toggle.
                </p>
                {info.platform === 'darwin' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<RiExternalLinkLine size={14} />}
                    onClick={() => void window.buddy.system.openAccessibilitySettings()}
                  >
                    Grant
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Section title="Feedback" description="The floating overlay and sound cues while recording.">
              <Row title="Recording overlay" description="Show the live level while you record.">
                <Switch
                  label="Recording overlay"
                  checked={config.showOverlay}
                  onChange={(value) => void patch({ showOverlay: value })}
                />
              </Row>
              <Row title="Overlay position">
                <Segmented
                  label="Overlay position"
                  value={config.overlayPosition}
                  onChange={(value) => void patch({ overlayPosition: value })}
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'bottom', label: 'Bottom' }
                  ]}
                />
              </Row>
              <Row title="Sound cues" description="A short tone when recording starts and stops.">
                <Switch
                  label="Sound cues"
                  checked={config.playSounds}
                  onChange={(value) => void patch({ playSounds: value })}
                />
              </Row>
            </Section>
          </Pane>
        </TabPanel>

        <TabPanel value="appearance">
          <Pane>
            <Section title="Theme" description="Buddy follows your system by default.">
              <Row title="Colour scheme">
                <Segmented
                  label="Theme"
                  value={config.theme}
                  onChange={(value) => void patch({ theme: value as ThemeMode })}
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' }
                  ]}
                />
              </Row>
              <Row title="Accent" description="One accent, applied everywhere.">
                <div role="radiogroup" aria-label="Accent" className="flex flex-wrap items-center gap-2">
                  {ACCENTS.map((accent) => (
                    <button
                      key={accent.id}
                      role="radio"
                      aria-checked={config.accent === accent.id}
                      aria-label={accent.label}
                      title={accent.label}
                      onClick={() => void patch({ accent: accent.id })}
                      className="grid h-7 w-7 place-items-center rounded-full transition-transform duration-[var(--dur-quick)] active:scale-90 [&>svg]:block"
                      style={{
                        background: accent.color,
                        boxShadow:
                          config.accent === accent.id
                            ? `0 0 0 2px var(--surface), 0 0 0 4px ${accent.color}`
                            : undefined
                      }}
                    >
                      {config.accent === accent.id ? (
                        <RiCheckLine size={13} color="#fff" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </Row>
            </Section>

            <Section title="Motion">
              <Row
                title="Animations"
                description="Transitions and micro-interactions across the app."
              >
                <Switch
                  label="Animations"
                  checked={config.animations}
                  onChange={(value) => void patch({ animations: value })}
                />
              </Row>
              <Row title="Sidebar" description="Keep the navigation expanded or collapsed to icons.">
                <Switch
                  label="Collapse sidebar"
                  checked={config.sidebarCollapsed}
                  onChange={(value) => void patch({ sidebarCollapsed: value })}
                />
              </Row>
            </Section>
          </Pane>
        </TabPanel>

        <TabPanel value="audio">
          <Pane>
            <Section title="Input" description="Which microphone Buddy listens to.">
              <Row title="Input device">
                <div className="w-full sm:w-[280px]">
                  <Select
                    value={config.inputDeviceId ?? ''}
                    onValueChange={(deviceId) => {
                      const option = devices.find((device) => device.deviceId === deviceId)
                      void patch({
                        inputDeviceId: deviceId || null,
                        inputDeviceLabel: option?.label ?? null
                      })
                    }}
                    options={devices.map((device) => ({
                      value: device.deviceId,
                      label: device.label
                    }))}
                  />
                </div>
              </Row>
            </Section>

            <Section title="Capture" description="How and where recordings are written.">
              <Row title="Format">
                <div className="w-full sm:w-[220px]">
                  <Select
                    value={config.format}
                    onValueChange={(value) => void patch({ format: value as AudioFormat })}
                    options={[
                      { value: 'wav', label: 'WAV — lossless' },
                      { value: 'mp3', label: 'MP3 — 192 kbps' }
                    ]}
                  />
                </div>
              </Row>
              <div className="p-3.5">
                <Field label="Filename pattern" description="{date} {time} {datetime} {timestamp}">
                  <TextInput
                    value={config.filenamePattern}
                    onChange={(event) => void patch({ filenamePattern: event.target.value })}
                    className="mono text-[12px]"
                  />
                </Field>
              </div>
              <div className="p-3.5">
                <Field label="Output folder">
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={config.outputDir}
                      onChange={(event) => void patch({ outputDir: event.target.value })}
                      className="mono text-[12px]"
                    />
                    <Button
                      variant="secondary"
                      icon={<RiFolderOpenLine size={15} />}
                      className="shrink-0"
                      onClick={async () => {
                        const dir = await window.buddy.system.chooseFolder()
                        if (dir) void patch({ outputDir: dir })
                      }}
                    >
                      Choose
                    </Button>
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Limits" description="Guardrails so a stuck key never fills the disk.">
              <Row title="Minimum duration" description="Anything shorter is discarded.">
                <NumberField
                  value={config.minDurationMs}
                  min={0}
                  step={50}
                  suffix="ms"
                  onChange={(value) => void patch({ minDurationMs: value })}
                />
              </Row>
              <Row title="Silence floor" description="Recordings quieter than this are discarded.">
                <NumberField
                  value={config.silenceThreshold}
                  min={0}
                  max={32767}
                  step={25}
                  suffix="/ 32767"
                  onChange={(value) => void patch({ silenceThreshold: value })}
                />
              </Row>
              <Row title="Maximum length">
                <NumberField
                  value={config.maxDurationSec}
                  min={5}
                  step={5}
                  suffix="sec"
                  onChange={(value) => void patch({ maxDurationSec: value })}
                />
              </Row>
            </Section>
          </Pane>
        </TabPanel>

        <TabPanel value="transcription">
          <Pane>
            <Section title="Provider" description="Where speech becomes text.">
              <Row title="Engine" description="Local runs on this machine. OpenAI sends audio to an endpoint.">
                <Segmented
                  label="Provider"
                  value={t.provider}
                  onChange={(value) => void patch({ transcription: { provider: value as TranscriptionProvider } })}
                  options={[
                    { value: 'local', label: 'Local' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'none', label: 'Off' }
                  ]}
                />
              </Row>
            </Section>

            {t.provider === 'local' ? (
              <>
                <BackendStatus />
                <Section title="Local Whisper">
                  <Row title="Model" description="Larger models are slower but more accurate.">
                    <div className="w-full sm:w-[180px]">
                      <Select
                        value={t.localModel}
                        onValueChange={(value) =>
                          void patch({ transcription: { localModel: value as typeof t.localModel } })
                        }
                        options={['tiny', 'base', 'small', 'medium', 'large-v3'].map((model) => ({
                          value: model,
                          label: model
                        }))}
                      />
                    </div>
                  </Row>
                  <div className="p-3.5">
                    <Field
                      label="Python path"
                      description="Advanced — leave as python3 to use the environment Buddy manages."
                    >
                      <TextInput
                        value={t.pythonPath}
                        onChange={(event) => void patch({ transcription: { pythonPath: event.target.value } })}
                        className="mono text-[12px]"
                      />
                    </Field>
                  </div>
                </Section>
              </>
            ) : null}

            {t.provider === 'openai' ? (
              <Section title="OpenAI-compatible endpoint">
                <div className="p-3.5">
                  <Field label="API key">
                    <TextInput
                      type="password"
                      value={t.openai.apiKey}
                      placeholder="sk-…"
                      onChange={(event) => void patch({ transcription: { openai: { apiKey: event.target.value } } })}
                      className="mono text-[12px]"
                    />
                  </Field>
                </div>
                <div className="p-3.5">
                  <Field label="Base URL">
                    <TextInput
                      value={t.openai.baseUrl}
                      onChange={(event) => void patch({ transcription: { openai: { baseUrl: event.target.value } } })}
                      className="mono text-[11.5px]"
                    />
                  </Field>
                </div>
                <div className="p-3.5">
                  <Field label="Model">
                    <TextInput
                      value={t.openai.model}
                      onChange={(event) => void patch({ transcription: { openai: { model: event.target.value } } })}
                      className="mono text-[12px]"
                    />
                  </Field>
                </div>
              </Section>
            ) : null}

            {t.provider !== 'none' ? (
              <Section title="Behaviour">
                <Row title="Language" description="Use auto to detect what is spoken.">
                  <TextInput
                    value={t.language}
                    onChange={(event) => void patch({ transcription: { language: event.target.value } })}
                    className={cn(controlClass, 'mono w-full text-[12px] sm:w-[140px]')}
                  />
                </Row>
                <Row title="Transcribe automatically" description="Runs as soon as a recording is saved.">
                  <Switch
                    label="Auto transcribe"
                    checked={config.autoTranscribe}
                    onChange={(value) => void patch({ autoTranscribe: value })}
                  />
                </Row>
              </Section>
            ) : null}
          </Pane>
        </TabPanel>

        <TabPanel value="delivery">
          <Pane>
            <Section title="Output" description="What happens to the text once it exists.">
              <Row title="After transcription">
                <div className="w-full sm:w-[250px]">
                  <Select
                    value={config.afterTranscribe}
                    onValueChange={(value) => void patch({ afterTranscribe: value as PasteAction })}
                    options={[
                      { value: 'clipboard', label: 'Copy to clipboard' },
                      { value: 'paste', label: 'Paste into the focused field' },
                      { value: 'both', label: 'Copy and paste' },
                      { value: 'none', label: 'Do nothing' }
                    ]}
                  />
                </div>
              </Row>
              {config.afterTranscribe === 'paste' || config.afterTranscribe === 'both' ? (
                <Row title="Paste delay" description="Time for the clipboard to settle before pasting.">
                  <NumberField
                    value={config.pasteDelayMs}
                    min={0}
                    step={20}
                    suffix="ms"
                    onChange={(value) => void patch({ pasteDelayMs: value })}
                  />
                </Row>
              ) : null}
            </Section>

            <Section title="Automation" description="Optional extras after a recording is saved.">
              <div className="p-3.5">
                <Field
                  label="Post-save hook"
                  description="{file} is replaced with the full path to the recording."
                >
                  <TextInput
                    value={config.hook}
                    placeholder="rsync {file} user@host:~/voice/"
                    onChange={(event) => void patch({ hook: event.target.value })}
                    className="mono text-[12px]"
                  />
                </Field>
              </div>
            </Section>

            {info && !info.accessibilityTrusted ? (
              <div className="flex items-start gap-2.5 rounded-[var(--r-md)] border border-line bg-elevated p-3">
                <RiLockLine size={16} className="mt-0.5 shrink-0 text-[var(--warn-fg)]" />
                <p className="flex-1 text-[12px] leading-relaxed text-muted">
                  Pasting into other apps needs Accessibility permission.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<RiExternalLinkLine size={14} />}
                  onClick={() => void window.buddy.system.openAccessibilitySettings()}
                >
                  Open
                </Button>
              </div>
            ) : null}
          </Pane>
        </TabPanel>

        <TabPanel value="system">
          <Pane>
            <Section title="Startup">
              <Row title="Launch at login" description="Start Buddy automatically when you sign in.">
                <Switch
                  label="Launch at login"
                  checked={config.launchAtLogin}
                  onChange={(value) => void patch({ launchAtLogin: value })}
                />
              </Row>
              <Row
                title="Keep running in the tray"
                description="Closing the window hides Buddy instead of quitting."
              >
                <Switch
                  label="Minimize to tray"
                  checked={config.minimizeToTray}
                  onChange={(value) => void patch({ minimizeToTray: value })}
                />
              </Row>
            </Section>

            <Section title="Library">
              <Row title="Items kept in view" description="How many recent recordings the library lists.">
                <NumberField
                  value={config.maxLibraryItems}
                  min={20}
                  step={20}
                  suffix="items"
                  onChange={(value) => void patch({ maxLibraryItems: value })}
                />
              </Row>
              <Row title="Recordings folder">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RiFolderOpenLine size={14} />}
                  onClick={() => void window.buddy.system.openFolder()}
                >
                  Open
                </Button>
              </Row>
            </Section>

            <Section title="Advanced">
              <Row
                title="Reset all settings"
                description="Returns every option to its default. Recordings are untouched."
              >
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RiRestartLine size={14} />}
                  className={resetting ? 'shake' : ''}
                  onClick={async () => {
                    setResetting(true)
                    await window.buddy.config.reset()
                    setTimeout(() => setResetting(false), 500)
                  }}
                >
                  Reset
                </Button>
              </Row>
              <Row title="Version">
                <span className="mono text-[12px] text-muted">v{info?.version ?? '—'}</span>
              </Row>
            </Section>
          </Pane>
        </TabPanel>
      </Tabs>
    </div>
  )
}
