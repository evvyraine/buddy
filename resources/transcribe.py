#!/usr/bin/env python3
"""Local transcription helper for Buddy.

Usage:
    transcribe.py <audio_path> <model> <language>

Prints a single JSON object to stdout: {"text": str | null, "error": str | null}
Tries faster-whisper first, then falls back to openai-whisper.
"""

import json
import sys


def emit(text=None, error=None):
    sys.stdout.write(json.dumps({"text": text, "error": error}))
    sys.stdout.flush()


def transcribe(path, model_size, language):
    lang = None if language in (None, "", "auto") else language

    try:
        from faster_whisper import WhisperModel  # type: ignore

        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        segments, _ = model.transcribe(path, beam_size=5, language=lang)
        text = " ".join(s.text.strip() for s in segments).strip()
        return text or None
    except ImportError:
        pass

    try:
        import whisper  # type: ignore

        model = whisper.load_model(model_size)
        result = model.transcribe(path, language=lang)
        text = (result.get("text") or "").strip()
        return text or None
    except ImportError:
        pass

    raise RuntimeError(
        "no local whisper backend found — install faster-whisper or openai-whisper, "
        "or switch the transcription provider to openai in Settings"
    )


def main():
    if len(sys.argv) < 3:
        emit(error="usage: transcribe.py <audio_path> <model> [language]")
        return

    path = sys.argv[1]
    model_size = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "auto"

    try:
        emit(text=transcribe(path, model_size, language))
    except Exception as exc:  # noqa: BLE001
        emit(error=str(exc))


if __name__ == "__main__":
    main()
