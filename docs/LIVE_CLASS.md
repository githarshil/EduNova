# Live Class Architecture — Viva & Design Guide

This document explains how the **Live Hindi → Kannada Class** feature works under the hood, in plain language, and why each piece of technology was chosen.

---

## 1. End-to-End Flow

1. **Teacher starts a room (`/live`)** with a title and `TEACHER_CODE` passcode. The server issues a 6-character uppercase room code (excluding ambiguous characters like `0/O/1/I/L`).
2. **Video & Original Hindi Audio (LiveKit / WebRTC):**
   - The teacher's camera (`640×360 @ 15 fps`) and microphone stream through **LiveKit**.
   - Students subscribe to the teacher's stream. If a student selects **"Kannada"**, the browser mutes the teacher's original Hindi audio track locally and plays the translated Kannada voice instead. If a student toggles **"Audio only"**, LiveKit unsubscribes the video track to save mobile data.
3. **Speech-to-Kannada Translation Chain (Node.js Server + Sarvam AI):**
   - Simultaneously, the teacher's browser captures raw microphone audio using an **AudioWorklet** (`16 kHz` mono `linear16` PCM in `~160 ms` chunks) and sends it over a **WebSocket (`/ws/live`)** to our Node.js server.
   - The server streams that audio to **Sarvam Realtime Speech-to-Text (`saaras:v4`, `hi-IN`)** with STEM `keyterms` biasing from `backend/src/live/glossary.json`.
   - Whenever Sarvam detects a finished Hindi sentence (`transcript.final`), the server:
     1. Translates Hindi → Kannada via **Sarvam Text Translation (`mayura:v1`, `POST /translate`)** and applies STEM glossary find-and-replace.
     2. Converts the Kannada sentence into spoken audio via **Sarvam Bulbul TTS (`bulbul:v4-flash`, `POST /text-to-speech`, `kn-IN`, pace `1.15`)**.
     3. Broadcasts **one event** (`seq`, `hindi`, `kannada`, `audio`, `timings`) to every student in the room and saves the text-only transcript (`seq`, `hindi`, `kannada`, `timestamp`).

---

## 2. The Four Core Technologies (and Why We Chose Each)

### A. WebRTC & LiveKit (Video + Original Audio)
- **What it is:** WebRTC is the browser standard for low-latency peer-to-peer / SFU (Selective Forwarding Unit) audio and video streaming. **LiveKit** is an open-source SFU media server and SDK built on top of WebRTC.
- **Why we chose it:**
  - Sending raw video through our Express backend would overload Node.js. LiveKit's SFU forwards media efficiently over UDP/WebRTC, adapts video quality automatically (`adaptiveStream`), and lets students turn off video subscription (`setSubscribed(false)`) in one call for **"Audio only"** mode.
  - LiveKit permissions (`canPublish: false` for students, `canPublish: true` for the teacher) enforce listen-only classrooms at the media-server level.

### B. AudioWorklet (Clean Mic Capture for Translation)
- **What it is:** `AudioWorklet` is a modern Web Audio API hook that runs custom JavaScript audio processing on a dedicated high-priority audio thread, separate from the main UI thread.
- **Why we chose it:**
  - The older `ScriptProcessorNode` ran on the main UI thread, causing audio glitches whenever React re-rendered.
  - `AudioWorklet` lets us downsample the browser's native 44.1/48 kHz microphone stream cleanly to **16 kHz mono 16-bit PCM** in **160 ms chunks** with zero UI jank, matching the exact format Sarvam's Realtime STT WebSocket expects.

### C. Streaming Speech-to-Text (Sarvam `saaras:v4` WebSocket)
- **What it is:** Instead of waiting for a 60-second recording to upload, **streaming STT** sends tiny 160 ms audio chunks continuously over a persistent WebSocket and uses server-side Voice Activity Detection (VAD) to emit partial words immediately and a `transcript.final` event the moment the teacher pauses between sentences.
- **Why we chose it:**
  - **Low latency:** We start translating right after each natural sentence (~0.5 s pause) rather than chopping mid-word on fixed 5-second timers.
  - **STEM accuracy:** `saaras:v4` supports up to 50 `keyterms` so physics/chemistry/biology vocabulary is recognized accurately.
  - **Why not Sarvam's STT `translate` mode?** Sarvam's speech-to-text `translate` mode outputs **English** only. Because our classroom needs **Hindi → Kannada**, we run `saaras:v4` in `transcribe` mode (`hi-IN`), then `mayura:v1` text translation (`hi-IN → kn-IN`), then `bulbul:v4-flash` TTS (`kn-IN`).
  - **Cost & Privacy:** The server runs STT + Translate + TTS **once per sentence** and fans out the result to up to 30 students—so API cost does not multiply with class size, the `SARVAM_API_KEY` never leaves the server, and raw audio is never saved.

### D. Web Audio API Playback Queue (Ordered, Lag-Safe Kannada Speech)
- **What it is:** A client-side audio scheduler built with `AudioContext`, `decodeAudioData`, and `AudioBufferSourceNode`.
- **Why we chose it:**
  - Plain `<audio>` tags overlap or cut each other off when sentences arrive rapidly, and browsers block autoplay until a user gesture (`Start listening`).
  - Our queue plays segments strictly in **`seq` order** without overlapping, plays slightly faster (**1.15×**) so translated Kannada keeps pace with Hindi speech, and enforces a **lag cap**: if more than **8 seconds** of unplayed audio piles up, it skips the oldest segments, keeps the **latest 2**, and displays the `"Catching up"` status chip so the student stays synchronized with the teacher's video.
