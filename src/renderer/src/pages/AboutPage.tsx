import { useEffect, useState } from 'react'
import {
  RiExternalLinkLine,
  RiFlashlightLine,
  RiGithubLine,
  RiKeyboardLine,
  RiMicLine,
  RiSoundModuleLine
} from '@remixicon/react'
import { useBuddy } from '../lib/store'
import { Logo } from '../components/Logo'
import { Kbd, SectionLabel } from '../components/ui/primitives'
import { prettyShortcut } from '../lib/format'

const FEATURES = [
  {
    icon: RiKeyboardLine,
    title: 'Global push to talk',
    body: 'Any shortcut, anywhere on the system. Hold to record, release to save.'
  },
  {
    icon: RiMicLine,
    title: 'Records in the background',
    body: 'Buddy lives in the tray, so playback and recording never interrupt your work.'
  },
  {
    icon: RiSoundModuleLine,
    title: 'Transcribed on save',
    body: 'Local Whisper or an OpenAI-compatible endpoint, wired straight into the clipboard.'
  },
  {
    icon: RiFlashlightLine,
    title: 'Pastes where you type',
    body: 'Drop the text into the focused field of whatever app you were already using.'
  }
]

export function AboutPage(): React.JSX.Element {
  const state = useBuddy((s) => s.state)
  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.buddy.system.info().then((info) => setVersion(info.version))
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--r-xl)] border border-line bg-surface">
            <Logo size={30} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[19px] text-ink">Buddy</h1>
            <p className="mt-0.5 text-[13px] text-muted">Hold a key to record. Release to transcribe.</p>
          </div>
          <span className="mono ml-auto rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted">
            v{version || '—'}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="lift rounded-[var(--r-lg)] border border-line bg-surface p-5">
                <Icon size={20} className="text-accent-text" />
                <h3 className="mt-4 text-[13px] text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{feature.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 rounded-[var(--r-lg)] border border-line bg-surface p-4">
          <SectionLabel>Your shortcut</SectionLabel>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Kbd className="h-7 px-2.5 text-[12px]">{prettyShortcut(state?.shortcutLabel ?? 'Unset')}</Kbd>
            <span className="text-[12.5px] text-muted">
              {state?.mode === 'toggle' ? 'press to start and stop' : 'hold while you speak'}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <p className="text-[12px] text-faint">
            Local-first. Nothing leaves your machine unless you point it at a cloud endpoint.
          </p>
          <a
            href="https://github.com/evvyraine/buddy"
            className="mono ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-accent-text hover:underline"
          >
            <RiGithubLine size={15} />
            Source
            <RiExternalLinkLine size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
