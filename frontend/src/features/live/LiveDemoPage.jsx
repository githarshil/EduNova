import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Play,
  ChevronDown,
  ChevronUp,
  Activity,
  ShieldCheck,
  Radio,
  HardDrive,
  FileText,
  PauseCircle
} from 'lucide-react';
import {
  SectionHeader,
  PaperCard,
  Tape,
  Tag,
  Button,
  StickyNote
} from '../../components/ui';
import { ensureKannadaFontLoaded } from './kannadaFontLoader';
import {
  getDemoHealth,
  getDemoScript,
  translateDemoSentence,
  fetchOfflineDemoManifest,
  DemoWsClient
} from './demoClient';
import StatusChip from './StatusChip';
import PipelineSteps from './PipelineSteps';
import './live.css';

const FALLBACK_SCRIPT = [
  { id: 1, hindi: 'नमस्ते बच्चों, आज हम बल और गति के बारे में सीखेंगे।', needsReview: true },
  { id: 2, hindi: 'वेग का मतलब है किसी वस्तु की गति और उसकी दिशा।', needsReview: true },
  { id: 3, hindi: 'पौधे सूर्य की रोशनी से अपना भोजन बनाते हैं, इसे प्रकाश संश्लेषण कहते हैं।', needsReview: true },
  { id: 4, hindi: 'पानी में हाइड्रोजन और ऑक्सीजन के परमाणु होते हैं।', needsReview: true },
  { id: 5, hindi: 'किसी त्रिभुज के तीनों कोणों का योग एक सौ अस्सी डिग्री होता है।', needsReview: true },
  { id: 6, hindi: 'अब आप सब एक छोटा सा प्रश्न हल करके देखिए।', needsReview: true }
];

const SOURCE_MODES = [
  { id: 'mic', label: 'Microphone', chip: 'Live' },
  { id: 'sample', label: 'Sample sentences', chip: 'Sample, live translation' },
  { id: 'offline', label: 'Offline sample', chip: 'Offline sample, pre-recorded' }
];

const EMPTY_STEPS = {
  hindiSpeech: false,
  hindiText: false,
  kannadaText: false,
  kannadaSpeech: false
};

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function LiveDemoPage() {
  const [sourceMode, setSourceMode] = useState('mic');
  const [wsStatus, setWsStatus] = useState('live');
  const [soundOn, setSoundOn] = useState(true);
  const [bigText, setBigText] = useState(false);

  // Mic & half-duplex state
  const [isRecording, setIsRecording] = useState(false);
  const [translatingMic, setTranslatingMic] = useState(false);
  const [waitingForKannada, setWaitingForKannada] = useState(false);
  const [interimHindi, setInterimHindi] = useState('');
  const interimHindiRef = useRef('');
  const hadAudioChunksRef = useRef(false);
  const levelBarRef = useRef(null);

  // Local meeting camera preview (stays strictly in the browser)
  const [camEnabled, setCamEnabled] = useState(true);
  const [camStatus, setCamStatus] = useState('starting'); // 'starting' | 'active' | 'off' | 'unavailable'
  const camVideoRef = useRef(null);
  const camStreamRef = useRef(null);

  // Sample & offline progression
  const [scriptSentences, setScriptSentences] = useState(FALLBACK_SCRIPT);
  const [sampleCursor, setSampleCursor] = useState(0); // 0-based index of next sentence
  const [offlineManifest, setOfflineManifest] = useState(null);
  const [busyTranslating, setBusyTranslating] = useState(false);

  // Output sentences & playback
  const [rows, setRows] = useState([]);
  const [playingRowId, setPlayingRowId] = useState(null);
  const [steps, setSteps] = useState(EMPTY_STEPS);
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  // Pre-demo readiness check
  const [checks, setChecks] = useState({
    mic: 'idle',     // 'idle' | 'checking' | 'ready' | 'failed'
    service: 'idle',
    sound: 'idle'
  });
  const [checkDetails, setCheckDetails] = useState('');

  // Refs
  const audioCtxRef = useRef(null);
  const currentSourceRef = useRef(null);
  const wsClientRef = useRef(null);
  const workletNodeRef = useRef(null);
  const micCleanupRef = useRef(null);
  const scrollRef = useRef(null);
  const seqCounterRef = useRef(0);
  const soundOnRef = useRef(soundOn);
  const isRecordingRef = useRef(isRecording);
  const sourceModeRef = useRef(sourceMode);

  soundOnRef.current = soundOn;
  isRecordingRef.current = isRecording;
  sourceModeRef.current = sourceMode;

  // Load Noto Sans Kannada exclusively for this page
  useEffect(() => {
    ensureKannadaFontLoaded();
  }, []);

  // Load demo script when switching to sample mode
  useEffect(() => {
    let cancelled = false;
    getDemoScript()
      .then((res) => {
        if (!cancelled && Array.isArray(res?.sentences) && res.sentences.length > 0) {
          setScriptSentences(res.sentences);
        }
      })
      .catch(() => {
        // Keep fallback 6-sentence script quietly
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll Kannada sheet when new rows arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [rows.length]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopCurrentPlayback = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.onended = null;
        currentSourceRef.current.stop();
        currentSourceRef.current.disconnect();
      } catch (_) {}
      currentSourceRef.current = null;
    }
    setPlayingRowId(null);
    setWaitingForKannada(false);
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ muted: false });
    }
  }, []);

  const playAudioPayload = useCallback(
    async (row) => {
      if (!soundOnRef.current) {
        setSteps((prev) => ({ ...prev, kannadaSpeech: true }));
        return;
      }

      const hasAudio = Boolean(row.audioBase64 || row.audioUrl);
      if (!hasAudio) {
        setSteps((prev) => ({ ...prev, kannadaSpeech: true }));
        return;
      }

      stopCurrentPlayback();

      // Half-duplex: pause mic streaming while Kannada plays so speaker output doesn't loop
      if (isRecordingRef.current && workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({ muted: true });
        setWaitingForKannada(true);
      }

      try {
        const ctx = await ensureAudioContext();
        let arrayBuf;
        if (row.audioBase64) {
          arrayBuf = base64ToArrayBuffer(row.audioBase64);
        } else {
          const resp = await fetch(row.audioUrl);
          if (!resp.ok) throw new Error('Could not load cached Kannada audio file.');
          arrayBuf = await resp.arrayBuffer();
        }

        const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = row.playbackRate || 1.0;
        source.connect(ctx.destination);

        currentSourceRef.current = source;
        setPlayingRowId(row.id);

        await new Promise((resolve) => {
          source.onended = () => {
            if (currentSourceRef.current === source) {
              currentSourceRef.current = null;
            }
            setPlayingRowId(null);
            setWaitingForKannada(false);
            if (workletNodeRef.current) {
              workletNodeRef.current.port.postMessage({ muted: false });
            }
            setSteps((prev) => ({ ...prev, kannadaSpeech: true }));
            resolve();
          };
          source.start(0);
        });
      } catch (err) {
        setPlayingRowId(null);
        setWaitingForKannada(false);
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage({ muted: false });
        }
        setErrorBanner({
          message: err?.message || 'Could not play Kannada audio in the browser.',
          retryAction: null
        });
      }
    },
    [ensureAudioContext, stopCurrentPlayback]
  );

  const pendingStopCloseRef = useRef(null);

  const releaseMicHardware = useCallback(() => {
    setIsRecording(false);
    setWaitingForKannada(false);
    if (levelBarRef.current) {
      levelBarRef.current.style.width = '0%';
    }
    if (micCleanupRef.current) {
      micCleanupRef.current();
      micCleanupRef.current = null;
    }
    workletNodeRef.current = null;
  }, []);

  const closeMicSocket = useCallback(() => {
    if (pendingStopCloseRef.current) {
      clearTimeout(pendingStopCloseRef.current);
      pendingStopCloseRef.current = null;
    }
    setTranslatingMic(false);
    interimHindiRef.current = '';
    setInterimHindi('');
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }
    setWsStatus('live');
  }, []);

  const stopMicrophone = useCallback(
    (keepWsForFlush = false) => {
      releaseMicHardware();

      if (pendingStopCloseRef.current) {
        clearTimeout(pendingStopCloseRef.current);
        pendingStopCloseRef.current = null;
      }

      // Always flush when audio was captured so short or manual stops still translate
      if (
        keepWsForFlush &&
        wsClientRef.current &&
        (hadAudioChunksRef.current || interimHindiRef.current.trim())
      ) {
        setTranslatingMic(true);
        wsClientRef.current.sendControl({ type: 'flush' });
        pendingStopCloseRef.current = setTimeout(() => {
          closeMicSocket();
        }, 4500);
        return;
      }

      closeMicSocket();
    },
    [closeMicSocket, releaseMicHardware]
  );

  const startMicrophone = useCallback(async () => {
    setErrorBanner(null);
    stopCurrentPlayback();
    closeMicSocket();
    hadAudioChunksRef.current = false;
    setSteps({ ...EMPTY_STEPS, hindiSpeech: true });

    try {
      await ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const micCtx = new AudioCtx();
      if (micCtx.state === 'suspended') {
        await micCtx.resume();
      }
      const workletUrl = new URL('./pcm-processor.js', import.meta.url);
      await micCtx.audioWorklet.addModule(workletUrl);

      const source = micCtx.createMediaStreamSource(stream);
      const analyser = micCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.45;
      const node = new AudioWorkletNode(micCtx, 'pcm-16k-processor');
      workletNodeRef.current = node;

      const silentGain = micCtx.createGain();
      silentGain.gain.value = 0;

      let sentenceFinalized = false;
      let heardSpeech = false;
      let lastSpeechAt = 0;
      let sentAutoFlush = false;

      const ws = new DemoWsClient({
        onStatus: (st) => setWsStatus(st),
        onMessage: async (msg) => {
          if (msg.type === 'partial') {
            const text = msg.hindi || '';
            interimHindiRef.current = text;
            setInterimHindi(text);
            if (text) {
              heardSpeech = true;
              lastSpeechAt = performance.now();
              setSteps({
                hindiSpeech: true,
                hindiText: false,
                kannadaText: false,
                kannadaSpeech: false
              });
            }
          } else if (msg.type === 'stt_final') {
            sentenceFinalized = true;
            // One-click single-sentence capture: stop mic automatically once the sentence ends
            releaseMicHardware();
            setTranslatingMic(true);
            const text = msg.hindi || '';
            interimHindiRef.current = text;
            setInterimHindi(text);
            setSteps({
              hindiSpeech: true,
              hindiText: true,
              kannadaText: false,
              kannadaSpeech: false
            });

            if (pendingStopCloseRef.current) {
              clearTimeout(pendingStopCloseRef.current);
            }
            pendingStopCloseRef.current = setTimeout(() => {
              closeMicSocket();
            }, 8000);
          } else if (msg.type === 'segment') {
            closeMicSocket();
            setSteps({
              hindiSpeech: true,
              hindiText: true,
              kannadaText: true,
              kannadaSpeech: false
            });

            seqCounterRef.current += 1;
            const row = {
              id: `mic-${Date.now()}-${seqCounterRef.current}`,
              seq: seqCounterRef.current,
              hindi: msg.hindi,
              kannada: msg.kannada,
              audioBase64: msg.audio,
              timings: msg.timings,
              sourceChip: 'Live'
            };

            setRows((prev) => [...prev, row]);
            setAriaAnnouncement(`Translated to Kannada: ${msg.kannada}`);

            // Play Kannada audio ONLY after Kannada text has appeared in the sheet
            requestAnimationFrame(() => {
              playAudioPayload(row);
            });
          } else if (msg.type === 'session_expired') {
            stopMicrophone(false);
            setErrorBanner({
              message: msg.message || '10-minute demo session cap reached.',
              retryAction: 'mic'
            });
          } else if (msg.type === 'error') {
            stopMicrophone(false);
            setErrorBanner({
              message: msg.message || 'Translation service error.',
              retryAction: 'mic'
            });
          }
        },
        onError: (message) => {
          stopMicrophone(false);
          setErrorBanner({
            message,
            retryAction: 'mic'
          });
        }
      });

      wsClientRef.current = ws;
      ws.connect();

      node.port.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          hadAudioChunksRef.current = true;
          ws.sendPcm(event.data);
        }
      };

      source.connect(analyser);
      analyser.connect(node);
      node.connect(silentGain);
      silentGain.connect(micCtx.destination);

      // Perceptual dBFS-scaled emerald level meter + silence auto-flush after speech
      const floatBuf = new Float32Array(analyser.fftSize);
      let rafId = 0;
      const updateLevel = () => {
        analyser.getFloatTimeDomainData(floatBuf);
        let sumSq = 0;
        for (let i = 0; i < floatBuf.length; i++) {
          sumSq += floatBuf[i] * floatBuf[i];
        }
        const rms = Math.sqrt(sumSq / floatBuf.length);
        // Map -55 dBFS .. -10 dBFS cleanly into 0% .. 100%
        const db = rms > 1e-5 ? 20 * Math.log10(rms) : -60;
        const pct = Math.max(0, Math.min(100, Math.round(((db + 55) / 45) * 100)));
        if (levelBarRef.current) {
          levelBarRef.current.style.width = `${pct}%`;
        }

        const now = performance.now();
        if (db > -44) {
          heardSpeech = true;
          lastSpeechAt = now;
        } else if (
          heardSpeech &&
          !sentAutoFlush &&
          !sentenceFinalized &&
          now - lastSpeechAt >= 850
        ) {
          sentAutoFlush = true;
          ws.sendControl({ type: 'flush' });
        }

        rafId = requestAnimationFrame(updateLevel);
      };
      rafId = requestAnimationFrame(updateLevel);

      micCleanupRef.current = () => {
        cancelAnimationFrame(rafId);
        try {
          node.disconnect();
          analyser.disconnect();
          source.disconnect();
          silentGain.disconnect();
          stream.getTracks().forEach((t) => t.stop());
          micCtx.close().catch(() => {});
        } catch (_) {}
      };

      setIsRecording(true);
    } catch (err) {
      stopMicrophone(false);
      setErrorBanner({
        message: err?.message || 'Microphone access was denied or unavailable.',
        retryAction: 'mic'
      });
    }
  }, [
    closeMicSocket,
    ensureAudioContext,
    playAudioPayload,
    releaseMicHardware,
    stopCurrentPlayback,
    stopMicrophone
  ]);

  const handleToggleMic = useCallback(() => {
    if (isRecording) {
      stopMicrophone(true);
    } else if (!translatingMic) {
      startMicrophone();
    }
  }, [isRecording, startMicrophone, stopMicrophone, translatingMic]);

  const handleTranslateNextSentence = useCallback(async () => {
    if (busyTranslating) return;
    setErrorBanner(null);
    await ensureAudioContext().catch(() => {});

    const total = scriptSentences.length;
    const idx = sampleCursor % total;
    const targetSentence = scriptSentences[idx];

    if (sourceMode === 'offline') {
      setBusyTranslating(true);
      try {
        let manifest = offlineManifest;
        if (!manifest) {
          manifest = await fetchOfflineDemoManifest();
          setOfflineManifest(manifest);
        }

        const cachedItem =
          manifest.items?.find((m) => m.seq === targetSentence.id) || manifest.items?.[idx];
        if (!cachedItem) {
          throw new Error('Offline sample sentence missing from manifest.');
        }

        // Artificial short stage progression so the 4 PipelineSteps pins remain clear
        setSteps({ hindiSpeech: true, hindiText: false, kannadaText: false, kannadaSpeech: false });
        await new Promise((r) => setTimeout(r, 150));
        setSteps({ hindiSpeech: true, hindiText: true, kannadaText: false, kannadaSpeech: false });
        await new Promise((r) => setTimeout(r, 180));
        setSteps({ hindiSpeech: true, hindiText: true, kannadaText: true, kannadaSpeech: false });

        seqCounterRef.current += 1;
        const row = {
          id: `offline-${Date.now()}-${seqCounterRef.current}`,
          seq: seqCounterRef.current,
          hindi: cachedItem.hindi,
          kannada: cachedItem.kannada,
          audioUrl: cachedItem.audioUrl,
          timings: cachedItem.timings,
          sourceChip: 'Offline sample, pre-recorded',
          isOffline: true
        };

        setRows((prev) => [...prev, row]);
        setSampleCursor((prev) => (prev + 1) % total);
        setAriaAnnouncement(`Offline sample Kannada: ${row.kannada}`);
        setBusyTranslating(false);

        await playAudioPayload(row);
      } catch (err) {
        setBusyTranslating(false);
        setErrorBanner({
          message: err?.message || 'Could not load offline pre-recorded sample.',
          retryAction: 'next'
        });
      }
      return;
    }

    // Sample sentences mode: real Sarvam Translate + Bulbul TTS (no STT)
    setBusyTranslating(true);
    setWsStatus('connecting');
    setSteps({ hindiSpeech: true, hindiText: true, kannadaText: false, kannadaSpeech: false });

    try {
      seqCounterRef.current += 1;
      const nextSeq = seqCounterRef.current;
      const res = await translateDemoSentence({
        index: targetSentence.id,
        seq: nextSeq
      });

      setWsStatus('live');
      setSteps({ hindiSpeech: true, hindiText: true, kannadaText: true, kannadaSpeech: false });

      const row = {
        id: `sample-${Date.now()}-${nextSeq}`,
        seq: nextSeq,
        hindi: res.hindi,
        kannada: res.kannada,
        audioBase64: res.audio,
        timings: res.timings,
        sourceChip: res.mockMode ? 'Sample (mock)' : 'Sample, live translation'
      };

      setRows((prev) => [...prev, row]);
      setSampleCursor((prev) => (prev + 1) % total);
      setAriaAnnouncement(`Translated to Kannada: ${row.kannada}`);
      setBusyTranslating(false);

      await playAudioPayload(row);
    } catch (err) {
      setBusyTranslating(false);
      setWsStatus('reconnecting');
      setErrorBanner({
        message: err?.message || 'Failed to reach translation server.',
        retryAction: 'next'
      });
    }
  }, [
    busyTranslating,
    ensureAudioContext,
    offlineManifest,
    playAudioPayload,
    sampleCursor,
    scriptSentences,
    sourceMode
  ]);

  const handleModeSwitch = (nextMode) => {
    if (nextMode === sourceMode) return;
    stopMicrophone();
    stopCurrentPlayback();
    setErrorBanner(null);
    setSteps(EMPTY_STEPS);
    setSourceMode(nextMode);
    setWsStatus(nextMode === 'offline' ? 'live' : 'live');
  };

  const handleRunPreDemoCheck = async () => {
    setErrorBanner(null);
    setCheckDetails('');
    setChecks({ mic: 'checking', service: 'checking', sound: 'checking' });

    // 1. Microphone ready
    let micOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      micOk = true;
    } catch {
      micOk = false;
    }

    // 2. Translation service ready
    let serviceOk = false;
    let serviceMsg = '';
    try {
      const h = await getDemoHealth();
      serviceOk = Boolean(h?.ready);
      if (!h?.enabled) serviceMsg = 'DEMO_ENABLED is not 1 on backend.';
      else if (!h?.sarvamConfigured && !h?.mockMode) serviceMsg = 'SARVAM_API_KEY missing.';
    } catch {
      serviceOk = false;
      serviceMsg = 'Backend unreachable (Offline sample still works).';
    }

    // 3. Sound ready
    let soundOk = false;
    try {
      const ctx = await ensureAudioContext();
      soundOk = Boolean(ctx && typeof ctx.decodeAudioData === 'function');
    } catch {
      soundOk = false;
    }

    setChecks({
      mic: micOk ? 'ready' : 'failed',
      service: serviceOk ? 'ready' : 'failed',
      sound: soundOk ? 'ready' : 'failed'
    });
    if (serviceMsg) setCheckDetails(serviceMsg);
  };

  // Keyboard shortcuts: Space = start/stop speaking, N = next sentence (when focus not in a field)
  useEffect(() => {
    const onKeyDown = (e) => {
      const el = document.activeElement;
      const tag = el?.tagName;
      const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el?.isContentEditable);
      if (isField) return;

      const isButtonOrLink = tag === 'BUTTON' || tag === 'A';
      if (e.code === 'Space' && !isButtonOrLink && sourceModeRef.current === 'mic') {
        e.preventDefault();
        handleToggleMic();
      } else if ((e.key === 'n' || e.key === 'N') && sourceModeRef.current !== 'mic') {
        e.preventDefault();
        handleTranslateNextSentence();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleToggleMic, handleTranslateNextSentence]);

  // Stop local camera stream cleanly
  const stopCamera = useCallback(() => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      camStreamRef.current = null;
    }
    if (camVideoRef.current) {
      camVideoRef.current.srcObject = null;
    }
  }, []);

  // Manage local meeting camera preview when Microphone mode & Camera toggle are active
  useEffect(() => {
    if (sourceMode !== 'mic' || !camEnabled) {
      stopCamera();
      setCamStatus('off');
      return undefined;
    }

    let cancelled = false;
    setCamStatus('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamStatus('unavailable');
      return undefined;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: false
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch (_) {}
          });
          return;
        }
        camStreamRef.current = stream;
        if (camVideoRef.current) {
          camVideoRef.current.srcObject = stream;
          camVideoRef.current.play().catch(() => {});
        }
        setCamStatus('active');
      })
      .catch(() => {
        if (!cancelled) {
          setCamStatus('unavailable');
        }
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [sourceMode, camEnabled, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopMicrophone();
      stopCurrentPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopCamera, stopCurrentPlayback, stopMicrophone]);

  const activeSourceMeta = SOURCE_MODES.find((m) => m.id === sourceMode) || SOURCE_MODES[0];
  const currentSentenceObj = scriptSentences[sampleCursor % scriptSentences.length];

  const renderCheckBadge = (state, label) => {
    const isReady = state === 'ready';
    const isFailed = state === 'failed';
    return (
      <div className={`demo-check-item${isReady ? ' is-ready' : isFailed ? ' is-failed' : ''}`}>
        {isReady ? (
          <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
        ) : isFailed ? (
          <AlertCircle size={16} strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
        )}
        <span>{label}</span>
        <span className="demo-check-item__state">
          {state === 'checking' ? 'Checking' : state === 'ready' ? 'Ready' : state === 'failed' ? 'Issue' : 'Not run'}
        </span>
      </div>
    );
  };

  return (
    <div className="live-page">
      {/* Screen reader live region for each new Kannada translation */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      {/* Desk Title Block */}
      <SectionHeader
        as="h1"
        tag="Live demo"
        title="Speak Hindi. Hear Kannada."
        note="one sentence at a time"
      />

      {/* Source switch + authenticity badge + status + global controls */}
      <div className="demo-topbar">
        <div className="demo-source-wrap">
          <div className="live-lang-segment" role="tablist" aria-label="Translation input source">
            {SOURCE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={sourceMode === mode.id}
                className={`live-lang-segment__btn${sourceMode === mode.id ? ' is-active' : ''}`}
                onClick={() => handleModeSwitch(mode.id)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {sourceMode === 'offline' ? (
            <Tag variant="paper">
              <HardDrive size={13} strokeWidth={2} aria-hidden="true" />
              <span>{activeSourceMeta.chip}</span>
            </Tag>
          ) : (
            <>
              <Tag variant={sourceMode === 'mic' ? 'ready' : 'paper'} dot={sourceMode === 'mic'}>
                {sourceMode === 'mic' ? (
                  <Radio size={13} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <FileText size={13} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{activeSourceMeta.chip}</span>
              </Tag>
              <StatusChip status={wsStatus} />
            </>
          )}
        </div>

        <div className="demo-controls-group">
          <Button
            variant={soundOn ? 'note' : 'ghost'}
            size="sm"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (!next) stopCurrentPlayback();
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? (
              <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
            ) : (
              <VolumeX size={15} strokeWidth={2} aria-hidden="true" />
            )}
            <span>{soundOn ? 'Sound on' : 'Sound off'}</span>
          </Button>

          <Button
            variant={bigText ? 'note' : 'ghost'}
            size="sm"
            onClick={() => setBigText((v) => !v)}
            aria-pressed={bigText}
          >
            <Maximize2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>Big text</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopCurrentPlayback();
              setRows([]);
              setSteps(EMPTY_STEPS);
              setInterimHindi('');
              setErrorBanner(null);
            }}
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* 4-Pin Pipeline Steps */}
      <PipelineSteps steps={steps} />

      {/* Error Sticky (never silent fallback) */}
      {errorBanner ? (
        <StickyNote tone="pink" body rotation="-0.4deg" className="demo-error-sticky">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <AlertCircle size={18} strokeWidth={2} aria-hidden="true" />
              <strong>Translation paused:</strong>
              <span>{errorBanner.message}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setErrorBanner(null);
                  if (errorBanner.retryAction === 'mic') startMicrophone();
                  else if (errorBanner.retryAction === 'next') handleTranslateNextSentence();
                }}
              >
                <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                <span>Retry</span>
              </Button>
              <Button
                variant="note"
                size="sm"
                onClick={() => handleModeSwitch('offline')}
              >
                <HardDrive size={14} strokeWidth={2} aria-hidden="true" />
                <span>Switch to offline sample</span>
              </Button>
            </div>
          </div>
        </StickyNote>
      ) : null}

      {/* Main Two-Column Spread (Kannada sheet stacks first on mobile) */}
      <div className="demo-stage-grid">
        {/* Left Card: Teacher speaks (Hindi) */}
        <PaperCard flat className="demo-speaker-card">
          <Tape tone="green" rotation="-1.5deg" />

          <div className="live-card-header">
            <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
              Teacher speaks (Hindi)
            </h2>
            <Tag variant={sourceMode === 'offline' ? 'paper' : 'ready'} dot={sourceMode === 'mic'}>
              {activeSourceMeta.chip}
            </Tag>
          </div>

          {sourceMode === 'mic' ? (
            <div className="demo-speaker-split">
              {/* Top half: local meeting camera preview */}
              <div className="demo-cam-panel">
                <div
                  className={`live-video-frame demo-cam-frame${
                    isRecording && !waitingForKannada ? ' demo-cam-frame--speaking' : ''
                  }`}
                >
                  <video
                    ref={camVideoRef}
                    autoPlay
                    playsInline
                    muted
                    aria-label="Teacher local camera preview"
                    className={camStatus === 'active' ? 'live-video-el demo-cam-el' : 'live-video-el--hidden'}
                  />
                  {camStatus !== 'active' ? (
                    <div className="live-video-placeholder">
                      <VideoOff size={28} strokeWidth={1.8} aria-hidden="true" />
                      <span className="type-small" style={{ color: 'var(--on-desk)' }}>
                        {camStatus === 'starting'
                          ? 'Starting camera...'
                          : camStatus === 'unavailable'
                            ? 'Camera unavailable'
                            : 'Camera off'}
                      </span>
                      <span className="type-small">Local preview only · not recorded</span>
                    </div>
                  ) : null}

                  <div className="live-video-namechip">
                    <span>Teacher</span>
                    {!isRecording ? (
                      <span className="live-video-muted-icon" title="Mic off" aria-label="Mic off">
                        <MicOff size={13} strokeWidth={2.2} aria-hidden="true" />
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="demo-cam-bar">
                  <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                    Local video only · never uploaded
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="demo-cam-toggle"
                    aria-pressed={camEnabled}
                    onClick={() => setCamEnabled((v) => !v)}
                  >
                    {camEnabled ? (
                      <>
                        <VideoOff size={15} strokeWidth={2.2} aria-hidden="true" />
                        <span>Camera off</span>
                      </>
                    ) : (
                      <>
                        <Video size={15} strokeWidth={2.2} aria-hidden="true" />
                        <span>Camera on</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Bottom half: mic controls, level meter, and live Hindi transcript */}
              <div className="demo-mic-panel">
                <div>
                  <Button
                    variant={isRecording ? 'danger' : 'kraft'}
                    size="lg"
                    disabled={translatingMic}
                    onClick={handleToggleMic}
                  >
                    {isRecording ? (
                      <>
                        <Square size={18} strokeWidth={2.2} aria-hidden="true" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Mic size={18} strokeWidth={2.2} aria-hidden="true" />
                        <span>{translatingMic ? 'Translating...' : 'Start speaking'}</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="demo-meter-wrap" aria-label="Microphone level meter">
                  <div className="demo-meter-track">
                    <div
                      ref={levelBarRef}
                      className="demo-meter-fill"
                      style={{ width: '0%' }}
                    />
                  </div>
                  <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                    {isRecording
                      ? 'Listening — speak one Hindi sentence, translates automatically...'
                      : translatingMic
                        ? 'Translating sentence to Kannada...'
                        : 'Click Start speaking, say one Hindi sentence — translates automatically'}
                  </span>
                </div>

                {waitingForKannada ? (
                  <div className="live-status-chip live-status-chip--catching-up" role="status">
                    <PauseCircle size={14} strokeWidth={2.2} aria-hidden="true" />
                    <span>Waiting for Kannada to finish</span>
                  </div>
                ) : null}

                <div className="demo-interim-box" lang="hi" aria-live="polite">
                  {interimHindi
                    ? interimHindi
                    : isRecording
                      ? 'Speak one Hindi sentence, then pause briefly...'
                      : translatingMic
                        ? 'Translating your sentence into Kannada...'
                        : 'Click Start speaking and say a sentence in Hindi.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="live-card-stack">
              <div className="live-card-header">
                <Tag variant="paper">
                  Sentence {(sampleCursor % scriptSentences.length) + 1} of {scriptSentences.length}
                </Tag>
                <span className="type-small" style={{ color: 'var(--ink-muted)' }}>
                  Press N or click below
                </span>
              </div>

              <p className="demo-upcoming-hindi" lang="hi">
                {currentSentenceObj?.hindi}
              </p>

              <div>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={busyTranslating}
                  onClick={handleTranslateNextSentence}
                >
                  <Play size={17} strokeWidth={2.2} aria-hidden="true" />
                  <span>{busyTranslating ? 'Translating...' : 'Translate next sentence'}</span>
                </Button>
              </div>
            </div>
          )}

          <StickyNote tone="yellow" rotation="-1deg" className="live-note-card">
            Use earphones or lower the speaker volume.
          </StickyNote>
        </PaperCard>

        {/* Right Card: Student hears (Kannada) — stacks FIRST on mobile */}
        <PaperCard flat variant="ruled" className="demo-listener-card">
          <Tape tone="yellow" rotation="1.5deg" />

          <div className="live-card-header">
            <h2 className="type-h2" style={{ color: 'var(--ink)' }}>
              Student hears (Kannada)
            </h2>
            <Tag variant="paper">
              {sourceMode === 'offline' ? 'Offline sample' : 'Kannada + Hindi'}
            </Tag>
          </div>

          <div
            ref={scrollRef}
            className="demo-sentences-scroll"
            aria-live="polite"
            aria-relevant="additions"
          >
            {rows.length === 0 ? (
              <p className="type-body" style={{ color: 'var(--ink-muted)' }}>
                No sentences translated yet. Speak a Hindi sentence or press &ldquo;Translate next sentence&rdquo; to hear Kannada output.
              </p>
            ) : null}

            {rows.map((row) => {
              const isPlaying = playingRowId === row.id;
              return (
                <div
                  key={row.id}
                  className={`demo-sentence-row${isPlaying ? ' is-playing' : ''}`}
                >
                  <div className="demo-sentence-row__meta">
                    <Tag variant="paper">#{row.seq} · {row.sourceChip}</Tag>
                    {isPlaying ? (
                      <span className="live-status-chip live-status-chip--live">
                        <Volume2 size={13} strokeWidth={2.2} aria-hidden="true" />
                        <span>Playing</span>
                      </span>
                    ) : null}
                  </div>

                  <p
                    className={`demo-sentence-row__kn${bigText ? ' is-big' : ''}`}
                    lang="kn"
                  >
                    {row.kannada}
                  </p>
                  <p className="demo-sentence-row__hi" lang="hi">
                    {row.hindi}
                  </p>

                  <div className="demo-sentence-row__actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!row.audioBase64 && !row.audioUrl}
                      onClick={() => playAudioPayload(row)}
                      aria-label={`Replay Kannada sentence ${row.seq}`}
                    >
                      <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
                      <span>Replay</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </PaperCard>
      </div>

      {/* Bottom Row: Open-by-default Dark Pipeline Panel + "Before you present" Check Card */}
      <div className="demo-bottom-grid">
        <section className="live-pipeline-panel" aria-label="Translation pipeline timings">
          <button
            type="button"
            className="live-pipeline-toggle"
            aria-expanded={pipelineOpen}
            onClick={() => setPipelineOpen((prev) => !prev)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} strokeWidth={2} aria-hidden="true" />
              <span>Pipeline timings (ms)</span>
            </span>
            {pipelineOpen ? (
              <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            )}
          </button>

          {pipelineOpen ? (
            <div className="live-pipeline-body">
              {rows.length === 0 ? (
                <p className="type-small" style={{ color: 'var(--on-desk-muted)' }}>
                  Each sentence reports STT ms, translate ms, TTS ms, and total delay here.
                </p>
              ) : (
                <table className="live-pipeline-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Source</th>
                      <th>STT ms</th>
                      <th>Translate ms</th>
                      <th>TTS ms</th>
                      <th>Total ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(-8).map((r) => (
                      <tr key={r.id}>
                        <td>{r.seq}</td>
                        <td>{r.isOffline ? 'Offline' : 'Live'}</td>
                        <td>{r.timings?.sttMs ?? 0}</td>
                        <td>{r.timings?.translateMs ?? 0}</td>
                        <td>{r.timings?.ttsMs ?? 0}</td>
                        <td>{r.timings?.totalMs ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </section>

        <PaperCard flat className="demo-check-card">
          <Tape tone="kraft" rotation="-1deg" />
          <div className="live-card-header">
            <h2 className="type-h3" style={{ color: 'var(--ink)' }}>
              Before you present
            </h2>
            <Button variant="note" size="sm" onClick={handleRunPreDemoCheck}>
              Run check
            </Button>
          </div>

          <div className="demo-check-list">
            {renderCheckBadge(checks.mic, 'Microphone ready')}
            {renderCheckBadge(checks.service, 'Translation service ready')}
            {renderCheckBadge(checks.sound, 'Sound ready')}
          </div>

          {checkDetails ? (
            <p className="type-small" style={{ color: 'var(--ink-muted)' }}>
              {checkDetails}
            </p>
          ) : null}
        </PaperCard>
      </div>
    </div>
  );
}
