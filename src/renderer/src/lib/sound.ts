let ctx: AudioContext | null = null

function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

/**
 * Two-note feedback: a rising pair for start, a falling pair for stop.
 * Deliberately quiet and short — motion and sound are feedback, not decoration.
 */
export function playCue(kind: 'start' | 'stop' | 'save' | 'error'): void {
  try {
    const audio = audioContext()
    if (audio.state === 'suspended') void audio.resume()
    const now = audio.currentTime
    const notes =
      kind === 'start'
        ? [523.25, 784]
        : kind === 'stop'
          ? [784, 523.25]
          : kind === 'save'
            ? [659.25, 987.77]
            : [196, 155.56]

    notes.forEach((freq, index) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = kind === 'error' ? 'triangle' : 'sine'
      osc.frequency.value = freq
      const at = now + index * 0.055
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.05, at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
      osc.connect(gain)
      gain.connect(audio.destination)
      osc.start(at)
      osc.stop(at + 0.2)
    })
  } catch {
    /* audio cue is optional */
  }
}
