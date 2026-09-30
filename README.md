<div align="center">
  <img src="resources/logo.png" width="260" alt="Buddy">
  <h1>Buddy</h1>
  <p><strong>Hold a key to record. Release to transcribe. Anywhere on your system.</strong></p>
</div>

Buddy is a desktop voice recorder. A global shortcut starts and stops it, the audio is saved, transcribed in the background, and the text lands in your clipboard or straight into whatever field you were typing in. It runs in the tray and keeps everything local unless you point it at a cloud endpoint.

## Features

- **Global push to talk** — configurable shortcut, held or toggled, works system-wide.
- **Records in the background** — lives in the menu bar; a live waveform overlay floats above your other windows.
- **Transcribes on save** — local Whisper (`faster-whisper`) or any OpenAI-compatible endpoint.
- **Delivers the text** — clipboard, paste into the focused field, both, or nothing, plus an optional post-save hook.
- **A real library** — search names and transcripts, play recordings in-app, re-transcribe, reveal, delete.
- **Fully configurable** — device, format, output folder, filename pattern, silence floor, delivery, tray behaviour, and more.

## Requirements

- Node 20+ to build from source, and a microphone.
- macOS: **Accessibility** permission for the global key listener and paste-into-field, and **Microphone** permission to record.
- `ffmpeg` is not required — WAV and MP3 are encoded in-app.
- `uv` on your PATH speeds up the first-run transcription setup; without it Buddy downloads its own copy. You never need Python, pip or a virtualenv.

## Develop

```bash
npm install
npm run dev      # run from source
npm run build    # bundle into out/
npm run typecheck
npm run dist     # package with electron-builder
```

> npm 11 blocks install scripts by default. If Electron's binary does not download during `npm install`, run `node node_modules/electron/install.js`.

## Configuration

Everything lives in **Settings** and saves instantly to `~/Library/Application Support/Buddy/config.json` (or the platform equivalent): shortcut and trigger mode, appearance and accent, audio device, format and output folder, transcription provider and model, delivery, and system behaviour.

### Transcription

Local by default and entirely automatic. On first run Buddy sets up its own Python environment and downloads the Whisper model, showing progress in Settings → Transcription — you never install Python, pip, or a virtualenv. After that it works offline.

Prefer the cloud? Set the provider to **OpenAI** and enter an API key. Any OpenAI-compatible `/audio/transcriptions` endpoint works, so you can point the base URL at a self-hosted gateway.

## License

MIT
