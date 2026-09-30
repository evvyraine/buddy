import { useCallback, useEffect, useRef, useState } from 'react'
import { mediaUrl } from './media'

export interface AudioPlayerState {
  currentPath: string | null
  playing: boolean
  progress: number
  durationMs: number
  toggle: (path: string) => void
  stop: () => void
}

export function useAudioPlayer(): AudioPlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [durationMs, setDurationMs] = useState(0)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTime = (): void =>
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    const onMeta = (): void => setDurationMs(Number.isFinite(audio.duration) ? audio.duration * 1000 : 0)
    const onEnd = (): void => {
      setPlaying(false)
      setCurrentPath(null)
      setProgress(0)
    }
    const onPause = (): void => setPlaying(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.pause()
      audio.src = ''
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    setCurrentPath(null)
    setProgress(0)
  }, [])

  const toggle = useCallback(
    (path: string) => {
      const audio = audioRef.current
      if (!audio) return
      if (currentPath === path) {
        stop()
        return
      }
      audio.src = mediaUrl(path)
      audio.currentTime = 0
      setCurrentPath(path)
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false)
          setCurrentPath(null)
        })
    },
    [currentPath, stop]
  )

  return { currentPath, playing, progress, durationMs, toggle, stop }
}
