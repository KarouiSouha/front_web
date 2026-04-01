/**
 * AIChat.tsx — Decision Advisor v4.0
 * ====================================
 * NEW FEATURES:
 *   1. Voice-to-Chat + Voice Response
 *      - Web Speech API (live transcription while recording)
 *      - OpenAI Whisper fallback (accurate transcription on send)
 *      - OpenAI TTS response playback (nova voice, streaming MP3)
 *      - Waveform visualizer during recording
 *
 *   2. "Explain My Decision" — AI Reasoning Trace
 *      - "Why?" button on every AI message
 *      - Calls POST /api/ai-insights/chat/explain/
 *      - Displays reasoning chain: steps, weights, data sources,
 *        signals ignored, alternative conclusions, confidence breakdown
 *
 * Design: matches DashboardPage aesthetic exactly (cardStyle, C.*, css vars)
 * Language: English only
 */

import {
  Sparkles, Send, ChevronRight, ThumbsUp, ThumbsDown,
  Brain, CheckCircle, Clock, User, RefreshCw, Zap,
  TrendingUp, Package, Users, BarChart3, DollarSign,
  AlertTriangle, ArrowRight, Loader, MessageSquare,
  Activity, Target, X, Mic, MicOff, Volume2, VolumeX,
  HelpCircle, ChevronDown, ChevronUp, Database, GitBranch,
  Lightbulb, AlertCircle, CheckCircle2, XCircle, Layers,
  Eye, EyeOff,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Design system
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  indigo:  '#6366f1',
  violet:  '#8b5cf6',
  cyan:    '#0ea5e9',
  teal:    '#14b8a6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  orange:  '#f97316',
  rose:    '#f43f5e',
};

const css = {
  card:    'hsl(var(--card))',
  cardFg:  'hsl(var(--card-foreground))',
  border:  'hsl(var(--border))',
  muted:   'hsl(var(--muted))',
  mutedFg: 'hsl(var(--muted-foreground))',
  bg:      'hsl(var(--background))',
  fg:      'hsl(var(--foreground))',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Role    = 'user' | 'ai';
type Topic   = 'credit' | 'stock' | 'churn' | 'forecast' | 'revenue' | 'general';
type Urgency = 'critical' | 'high' | 'medium' | 'low';
type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

interface DecisionOption { label: string; pros: string; cons: string; }
interface DecisionCard {
  question: string; recommendation: string; rationale: string;
  options: DecisionOption[]; owner: string; deadline: string;
}

interface ReasoningStep {
  step: number;
  label: string;
  data_point: string;
  weight: 'high' | 'medium' | 'low';
  insight: string;
}

interface ConfidenceBreakdown {
  data_quality: string;
  signal_consistency: string;
  recency: string;
  overall: string;
}

interface ExplainResult {
  reasoning_steps: ReasoningStep[];
  data_sources_used: string[];
  signals_ignored: string[];
  alternative_conclusions: string[];
  confidence_breakdown: ConfidenceBreakdown;
  key_assumption: string;
  fallback?: boolean;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  time: string;
  loading?: boolean;
  error?: boolean;
  fallback?: boolean;
  decision_needed?: boolean;
  decision_card?: DecisionCard | null;
  suggested_followups?: string[];
  urgency?: Urgency;
  topic?: Topic;
  contextSnapshot?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const uid = () => Math.random().toString(36).slice(2);

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init', role: 'ai',
  content: "Hello. I have real-time access to your receivables, churn signals, stock levels, anomalies, seasonal data, and revenue forecast.\n\nAsk any business question — or press the microphone to speak.",
  time: now(),
  suggested_followups: [
    "What are my most critical business risks right now?",
    "Which customers should I contact today and why?",
    "Do I need to make any urgent stock decisions?",
  ],
  topic: 'general', urgency: 'low',
};

const TOPICS: Record<string, { label: string; icon: React.ElementType; accent: string; questions: string[] }> = {
  credit: {
    label: 'Receivables', icon: DollarSign, accent: C.orange,
    questions: [
      "Who are my top overdue accounts and how much do they owe?",
      "Should I suspend credit for any customer?",
      "What is my current DSO and how can I improve it?",
    ],
  },
  churn: {
    label: 'Retention', icon: Users, accent: C.violet,
    questions: [
      "Which customers are most likely to churn and why?",
      "How much revenue am I at risk of losing to churn?",
      "Which churned customers should I try to win back?",
    ],
  },
  stock: {
    label: 'Stock', icon: Package, accent: C.cyan,
    questions: [
      "Which products need an emergency reorder right now?",
      "How much should I order and when?",
      "Which products are tying up capital with low rotation?",
    ],
  },
  forecast: {
    label: 'Forecast', icon: TrendingUp, accent: C.emerald,
    questions: [
      "What is my revenue outlook for the next 3 months?",
      "What is the main risk to my forecast?",
      "What should I do to hit my best-case scenario?",
    ],
  },
  revenue: {
    label: 'Revenue', icon: BarChart3, accent: C.indigo,
    questions: [
      "Which products and customers drive most of my margin?",
      "Where am I leaving money on the table?",
      "Which branch is underperforming and why?",
    ],
  },
};

const URGENCY_CONFIG: Record<Urgency, { color: string; label: string }> = {
  critical: { color: C.rose,    label: 'Critical' },
  high:     { color: C.orange,  label: 'High' },
  medium:   { color: C.amber,   label: 'Medium' },
  low:      { color: C.indigo,  label: '' },
};

const TOPIC_CONFIG: Record<Topic, { color: string; label: string }> = {
  credit:   { color: C.orange,   label: 'Receivables' },
  stock:    { color: C.cyan,     label: 'Stock' },
  churn:    { color: C.violet,   label: 'Retention' },
  forecast: { color: C.emerald,  label: 'Forecast' },
  revenue:  { color: C.indigo,   label: 'Revenue' },
  general:  { color: css.mutedFg, label: 'General' },
};

const WEIGHT_COLORS: Record<string, string> = {
  high: C.rose, medium: C.amber, low: C.teal,
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice recorder hook
// ─────────────────────────────────────────────────────────────────────────────

function useVoiceRecorder() {
  const [voiceState,   setVoiceState]   = useState<VoiceState>('idle');
  const [liveText,     setLiveText]     = useState('');
  const [audioLevels,  setAudioLevels]  = useState<number[]>(Array(20).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number>(0);
  const recognitionRef   = useRef<any>(null);

  // Waveform animation
  const startWaveform = (stream: MediaStream) => {
    const ctx      = new AudioContext();
    const src      = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    src.connect(analyser);
    analyserRef.current = analyser;

    const tick = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const levels = Array.from(data.slice(0, 20)).map(v => v / 255);
      setAudioLevels(levels);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const startRecording = useCallback(async (): Promise<void> => {
    if (voiceState !== 'idle') return;
    setLiveText('');
    setVoiceState('recording');

    // Web Speech API for live transcription (best-effort)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous     = true;
      rec.interimResults = true;
      rec.lang           = 'en-US';
      rec.onresult = (e: any) => {
        let t = '';
        for (let i = e.resultIndex; i < e.results.length; i++)
          t += e.results[i][0].transcript;
        setLiveText(t);
      };
      rec.start();
      recognitionRef.current = rec;
    }

    // MediaRecorder for Whisper fallback
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    startWaveform(stream);
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.start(100);
    mediaRecorderRef.current = mr;
  }, [voiceState]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      recognitionRef.current?.stop();
      cancelAnimationFrame(animFrameRef.current);
      setAudioLevels(Array(20).fill(0));

      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(new Blob()); return; }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    });
  }, []);

  return {
    voiceState, setVoiceState, liveText, setLiveText,
    audioLevels, startRecording, stopRecording,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS player hook
// ─────────────────────────────────────────────────────────────────────────────

function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const audioRef    = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!ttsEnabled || !text) return;
    // Stop current playback
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(true);

    try {
      // Clean text: remove markdown, truncate to 500 chars for speed
      const clean = text
        .replace(/\*\*/g, '')
        .replace(/\n/g, ' ')
        .replace(/\[.*?\]/g, '')
        .slice(0, 500);

      const token = localStorage.getItem('fasi_access_token') || '';
      const resp  = await fetch('/api/ai-insights/voice/speak/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: clean, voice: 'nova' }),
      });

      if (!resp.ok) throw new Error('TTS failed');

      const blob = await resp.blob();
      const url  = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsSpeaking(false); };
      audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, ttsEnabled, setTtsEnabled, speak, stopSpeaking };
}

// ─────────────────────────────────────────────────────────────────────────────
// Explain My Decision panel
// ─────────────────────────────────────────────────────────────────────────────

function ExplainPanel({ answer, onClose }: { answer: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [result,  setResult]  = useState<ExplainResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>('steps');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem('fasi_access_token') || '';
        const resp  = await fetch('/api/ai-insights/chat/explain/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ answer }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (mounted) { setResult(data); setLoading(false); }
      } catch (e: any) {
        if (mounted) { setError(e.message); setLoading(false); }
      }
    })();
    return () => { mounted = false; };
  }, [answer]);

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  const Section = ({ id, label, icon: Icon, color, children }: {
    id: string; label: string; icon: React.ElementType; color: string; children: React.ReactNode;
  }) => (
    <div style={{ borderRadius: 10, border: `1px solid ${css.border}`, overflow: 'hidden', marginBottom: 8 }}>
      <button onClick={() => toggle(id)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: expanded === id ? `${color}08` : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <Icon size={13} style={{ color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: expanded === id ? color : css.cardFg }}>{label}</span>
        {expanded === id ? <ChevronUp size={13} style={{ color: css.mutedFg }} /> : <ChevronDown size={13} style={{ color: css.mutedFg }} />}
      </button>
      {expanded === id && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${css.border}` }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      marginTop: 12, borderRadius: 14,
      border: `1px solid ${C.violet}30`,
      background: `${C.violet}05`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${C.indigo}15, ${C.violet}15)`,
        borderBottom: `1px solid ${C.violet}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={13} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.violet, margin: 0 }}>Reasoning Trace</p>
            <p style={{ fontSize: 10, color: css.mutedFg, margin: 0 }}>Why did I give this answer?</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: css.mutedFg, padding: 4 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', justifyContent: 'center', color: css.mutedFg }}>
            <Loader size={15} style={{ animation: 'chatSpin 1s linear infinite', color: C.violet }} />
            <span style={{ fontSize: 13 }}>Reconstructing my reasoning chain…</span>
          </div>
        )}

        {error && (
          <div style={{ padding: 12, borderRadius: 10, background: `${C.rose}08`, color: C.rose, fontSize: 12 }}>
            Could not load reasoning: {error}
          </div>
        )}

        {result && (
          <>
            {/* Confidence breakdown — always visible */}
            {result.confidence_breakdown && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
                {Object.entries(result.confidence_breakdown).map(([key, val]) => {
                  const color = val === 'high' ? C.emerald : val === 'medium' ? C.amber : C.rose;
                  const label = key.replace(/_/g, ' ');
                  return (
                    <div key={key} style={{ padding: '8px 10px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}25` }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: css.mutedFg, margin: '0 0 3px' }}>{label}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'capitalize' }}>{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Key assumption */}
            {result.key_assumption && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 10, background: `${C.amber}08`, border: `1px solid ${C.amber}25`, marginBottom: 10 }}>
                <Lightbulb size={13} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: css.cardFg, margin: 0, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 700, color: C.amber }}>Key assumption: </span>
                  {result.key_assumption}
                </p>
              </div>
            )}

            {/* Reasoning steps */}
            <Section id="steps" label={`Reasoning chain (${result.reasoning_steps?.length ?? 0} steps)`} icon={GitBranch} color={C.indigo}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {result.reasoning_steps?.map((step) => {
                  const wc = WEIGHT_COLORS[step.weight] ?? css.mutedFg;
                  return (
                    <div key={step.step} style={{ display: 'flex', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', fontSize: 10, fontWeight: 800,
                          background: `${C.indigo}20`, color: C.indigo,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>{step.step}</div>
                        {step.step < (result.reasoning_steps?.length ?? 0) && (
                          <div style={{ width: 1, flex: 1, minHeight: 12, background: `${css.border}`, margin: '2px 0' }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: css.cardFg }}>{step.label}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, color: wc, background: `${wc}15`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {step.weight}
                          </span>
                        </div>
                        <div style={{ padding: '6px 10px', borderRadius: 8, background: `${C.indigo}06`, border: `1px solid ${C.indigo}15`, marginBottom: 4 }}>
                          <p style={{ fontSize: 11, fontFamily: 'monospace', color: C.indigo, margin: 0 }}>{step.data_point}</p>
                        </div>
                        <p style={{ fontSize: 11, color: css.mutedFg, margin: 0, lineHeight: 1.4 }}>{step.insight}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Data sources */}
            {result.data_sources_used?.length > 0 && (
              <Section id="sources" label="Data sources used" icon={Database} color={C.teal}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {result.data_sources_used.map((s, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, color: C.teal, background: `${C.teal}12`, border: `1px solid ${C.teal}25` }}>{s}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* Signals ignored */}
            {result.signals_ignored?.length > 0 && (
              <Section id="ignored" label="Signals considered but deprioritized" icon={EyeOff} color={C.amber}>
                <div style={{ marginTop: 10 }}>
                  {result.signals_ignored.map((s, i) => (
                    <p key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: css.mutedFg, margin: '0 0 6px' }}>
                      <AlertCircle size={11} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />{s}
                    </p>
                  ))}
                </div>
              </Section>
            )}

            {/* Alternative conclusions */}
            {result.alternative_conclusions?.length > 0 && (
              <Section id="alt" label="Alternative conclusions I could have drawn" icon={Layers} color={C.violet}>
                <div style={{ marginTop: 10 }}>
                  {result.alternative_conclusions.map((s, i) => (
                    <p key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: css.mutedFg, margin: '0 0 6px' }}>
                      <ChevronRight size={11} style={{ color: C.violet, flexShrink: 0, marginTop: 1 }} />{s}
                    </p>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Waveform visualizer
// ─────────────────────────────────────────────────────────────────────────────

function WaveformBar({ levels }: { levels: number[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
      {levels.map((v, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          height: `${Math.max(6, v * 28)}px`,
          background: `linear-gradient(to top, ${C.rose}, ${C.violet})`,
          transition: 'height 0.05s ease',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Card
// ─────────────────────────────────────────────────────────────────────────────

function DecisionCardView({ card, onSelectOption }: { card: DecisionCard; onSelectOption: (q: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.indigo}30` }}>
      <div style={{ padding: '14px 16px', background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Brain size={13} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Decision Required</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>{card.question}</p>
      </div>
      <div style={{ padding: '12px 16px', background: `${C.emerald}08`, borderBottom: `1px solid ${C.emerald}20` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <CheckCircle size={14} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.emerald, margin: '0 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recommendation</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: css.cardFg, margin: '0 0 4px' }}>{card.recommendation}</p>
            <p style={{ fontSize: 12, color: css.mutedFg, margin: 0, fontStyle: 'italic' }}>{card.rationale}</p>
          </div>
        </div>
      </div>
      {card.options?.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${css.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: css.mutedFg, marginBottom: 10 }}>Options</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card.options.map((opt, i) => (
              <button key={i} onClick={() => { setSelected(i); onSelectOption(`Tell me more about option: "${opt.label}"`); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${selected === i ? C.indigo : css.border}`,
                  background: selected === i ? `${C.indigo}08` : css.card,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.indigo, width: 18, height: 18, borderRadius: 6, background: `${C.indigo}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: css.cardFg }}>{opt.label}</span>
                  {selected === i && <CheckCircle size={13} style={{ color: C.indigo, marginLeft: 'auto' }} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <ThumbsUp size={11} style={{ color: C.emerald, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: C.emerald }}>{opt.pros}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <ThumbsDown size={11} style={{ color: C.rose, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: C.rose }}>{opt.cons}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: css.muted + '40' }}>
        {card.owner && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: css.mutedFg }}><User size={11} /><span style={{ fontWeight: 600 }}>{card.owner}</span></span>}
        {card.deadline && <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: css.mutedFg }}><Clock size={11} />{card.deadline}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing indicator
// ─────────────────────────────────────────────────────────────────────────────

function TypingIndicator({ phrase }: { phrase: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
      <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: 4, background: css.muted + '80', maxWidth: 280 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo, animation: `chatBounce 1.2s infinite ${i * 0.2}s` }} />
          ))}
        </div>
        <span style={{ fontSize: 12, color: css.mutedFg }}>{phrase}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MessageBubble({ message, onFollowup, onSpeak, isSpeaking }: {
  message: ChatMessage;
  onFollowup: (q: string) => void;
  onSpeak: (text: string) => void;
  isSpeaking: boolean;
}) {
  const isUser = message.role === 'user';
  const [showExplain, setShowExplain] = useState(false);

  const renderContent = (text: string) =>
    text.split('\n').map((line, i, arr) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((p, j) => p.startsWith('**') && p.endsWith('**')
            ? <strong key={j} style={{ color: css.cardFg }}>{p.slice(2, -2)}</strong>
            : p)}
          {i < arr.length - 1 && <br />}
        </span>
      );
    });

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: '78%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={{ padding: '10px 16px', borderRadius: 16, borderBottomRightRadius: 4, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, color: '#fff', fontSize: 13, lineHeight: 1.55 }}>
              {renderContent(message.content)}
            </div>
            <span style={{ fontSize: 10, color: css.mutedFg }}>{message.time}</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 9, background: css.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={13} style={{ color: css.mutedFg }} />
          </div>
        </div>
      </div>
    );
  }

  const urgency    = message.urgency || 'low';
  const topic      = message.topic;
  const urgencyCfg = URGENCY_CONFIG[urgency];
  const topicCfg   = topic ? TOPIC_CONFIG[topic] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '92%' }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          <Sparkles size={13} color="#fff" />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Meta badges */}
          {(topic || urgency !== 'low') && !message.loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {topicCfg && topic !== 'general' && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, color: topicCfg.color, background: `${topicCfg.color}15`, border: `1px solid ${topicCfg.color}25` }}>
                  {topicCfg.label}
                </span>
              )}
              {urgency !== 'low' && urgencyCfg.label && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4, color: urgencyCfg.color, background: `${urgencyCfg.color}12`, border: `1px solid ${urgencyCfg.color}25` }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: urgencyCfg.color }} />
                  {urgencyCfg.label}
                </span>
              )}
              {message.fallback && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, color: C.amber, background: `${C.amber}12` }}>offline</span>}
            </div>
          )}

          {/* Bubble */}
          <div style={{ padding: '12px 16px', borderRadius: 16, borderTopLeftRadius: 4, background: css.muted + '60', fontSize: 13, color: css.cardFg, lineHeight: 1.6, border: `1px solid ${css.border}` }}>
            {renderContent(message.content)}
            {message.decision_card && <DecisionCardView card={message.decision_card} onSelectOption={onFollowup} />}
          </div>

          {/* Action bar — speak + explain */}
          {!message.loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* TTS button */}
              <button onClick={() => onSpeak(message.content)}
                title={isSpeaking ? 'Speaking…' : 'Read aloud'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 8, border: `1px solid ${css.border}`,
                  background: isSpeaking ? `${C.teal}15` : 'none',
                  color: isSpeaking ? C.teal : css.mutedFg, fontSize: 11, cursor: 'pointer',
                }}>
                {isSpeaking
                  ? <><Volume2 size={12} /><span>Speaking</span></>
                  : <><Volume2 size={12} /><span>Listen</span></>
                }
              </button>

              {/* Explain button */}
              <button onClick={() => setShowExplain(prev => !prev)}
                title="Show AI reasoning chain"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 8, border: `1px solid ${showExplain ? C.violet + '60' : css.border}`,
                  background: showExplain ? `${C.violet}12` : 'none',
                  color: showExplain ? C.violet : css.mutedFg, fontSize: 11, cursor: 'pointer',
                }}>
                <HelpCircle size={12} />
                <span>Why?</span>
              </button>
            </div>
          )}

          {/* Explain panel */}
          {showExplain && <ExplainPanel answer={message.content} onClose={() => setShowExplain(false)} />}

          {/* Suggested followups */}
          {message.suggested_followups && message.suggested_followups.length > 0 && !message.loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>Continue</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {message.suggested_followups.map((q, i) => (
                  <button key={i} onClick={() => onFollowup(q)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
                    border: `1px solid ${css.border}`, background: css.card, cursor: 'pointer',
                    fontSize: 12, color: css.cardFg, textAlign: 'left',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.indigo; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = css.border; }}
                  >
                    <ArrowRight size={11} style={{ color: C.indigo, flexShrink: 0 }} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <span style={{ fontSize: 10, color: css.mutedFg }}>{message.time}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Button
// ─────────────────────────────────────────────────────────────────────────────

function VoiceButton({ voiceState, audioLevels, onClick }: {
  voiceState: VoiceState;
  audioLevels: number[];
  onClick: () => void;
}) {
  const isRec = voiceState === 'recording';
  const isProc = voiceState === 'processing';
  const accent = isRec ? C.rose : isProc ? C.amber : C.indigo;

  return (
    <button onClick={onClick} title={isRec ? 'Stop recording' : 'Start voice input'}
      style={{
        width: 44, height: 44, borderRadius: 12, border: 'none',
        background: isRec ? `${C.rose}15` : `${C.indigo}12`,
        cursor: isProc ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
        boxShadow: isRec ? `0 0 0 3px ${C.rose}30` : 'none',
        transition: 'all 0.2s',
      }}>
      {isRec && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 12,
          animation: 'voicePulse 1.2s ease infinite',
          background: `${C.rose}20`,
        }} />
      )}
      {isProc
        ? <Loader size={16} style={{ color: C.amber, animation: 'chatSpin 1s linear infinite' }} />
        : isRec
        ? <MicOff size={16} style={{ color: C.rose, zIndex: 1 }} />
        : <Mic size={16} style={{ color: C.indigo }} />
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AIChat component
// ─────────────────────────────────────────────────────────────────────────────

const LOADING_PHRASES = [
  "Analyzing your business data",
  "Checking receivables and churn signals",
  "Reviewing stock levels and forecasts",
  "Preparing your recommendation",
];

interface StoredConversationSummary { id: string; title: string; created_at: string; updated_at: string; }
interface StoredConversationMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  metadata?: { decision_needed?: boolean; decision_card?: DecisionCard | null; suggested_followups?: string[]; urgency?: Urgency; topic?: Topic; fallback?: boolean; };
  created_at: string;
}

interface AIChatProps { className?: string; }

export function AIChat({ className = '' }: AIChatProps) {
  const [messages,       setMessages]       = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input,          setInput]          = useState('');
  const [sending,        setSending]        = useState(false);
  const [loadingPhrase,  setLoadingPhrase]  = useState(LOADING_PHRASES[0]);
  const [activeTopic,    setActiveTopic]    = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const phraseCycle = useRef(0);

  const voice = useVoiceRecorder();
  const tts   = useTTS();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!sending) return;
    const t = setInterval(() => {
      phraseCycle.current = (phraseCycle.current + 1) % LOADING_PHRASES.length;
      setLoadingPhrase(LOADING_PHRASES[phraseCycle.current]);
    }, 2000);
    return () => clearInterval(t);
  }, [sending]);

  // Load conversation history
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get<{ count: number; conversations: StoredConversationSummary[] }>('/ai-insights/conversations/');
        const latest = res.conversations?.[0];
        if (!latest) { if (mounted) { setMessages([INITIAL_MESSAGE]); } return; }
        const hist = await api.get<{ count: number; messages: StoredConversationMessage[] }>(`/ai-insights/conversations/${latest.id}/messages/`);
        const mapped = (hist.messages || []).map((m): ChatMessage => ({
          id: m.id, role: m.role === 'assistant' ? 'ai' : 'user', content: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          decision_needed: m.metadata?.decision_needed, decision_card: m.metadata?.decision_card ?? null,
          suggested_followups: m.metadata?.suggested_followups, urgency: m.metadata?.urgency,
          topic: m.metadata?.topic, fallback: m.metadata?.fallback,
        }));
        if (mounted) { setConversationId(latest.id); setMessages(mapped.length ? mapped : [INITIAL_MESSAGE]); }
      } catch { if (mounted) { setMessages([INITIAL_MESSAGE]); } }
      finally { if (mounted) setLoadingHistory(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed, time: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    inputRef.current?.focus();

    const apiHistory = [...messages, userMsg]
      .filter(m => !m.loading)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    try {
      const res = await api.post<{
        conversation_id?: string; answer: string; decision_needed: boolean;
        decision_card: DecisionCard | null; suggested_followups: string[];
        urgency: Urgency; topic: Topic; fallback: boolean;
      }>('/ai-insights/chat/', {
        messages: apiHistory,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      });
      if (res.conversation_id) setConversationId(res.conversation_id);
      const aiMsg: ChatMessage = {
        id: uid(), role: 'ai', content: res.answer, time: now(),
        decision_needed: res.decision_needed, decision_card: res.decision_card,
        suggested_followups: res.suggested_followups, urgency: res.urgency,
        topic: res.topic, fallback: res.fallback,
      };
      setMessages(prev => [...prev, aiMsg]);
      // Auto-speak response
      if (tts.ttsEnabled) tts.speak(res.answer);
    } catch {
      setMessages(prev => [...prev, {
        id: uid(), role: 'ai', content: "I'm temporarily unavailable. Please check your dashboard panels.",
        time: now(), error: true,
        suggested_followups: ["What are my top business risks?", "Which customers need urgent attention?"],
      }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, conversationId, tts]);

  // ── Voice handler ──────────────────────────────────────────────────────────
  const handleVoice = useCallback(async () => {
    if (voice.voiceState === 'recording') {
      // Stop and transcribe
      voice.setVoiceState('processing');
      const blob = await voice.stopRecording();

      // If Web Speech API got something, use it directly
      if (voice.liveText.trim()) {
        voice.setVoiceState('idle');
        send(voice.liveText.trim());
        voice.setLiveText('');
        return;
      }

      // Whisper fallback
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        const token = localStorage.getItem('fasi_access_token') || '';
        const resp = await fetch('/api/ai-insights/voice/transcribe/', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.transcription) {
            voice.setVoiceState('idle');
            send(data.transcription);
            voice.setLiveText('');
            return;
          }
        }
      } catch { /* ignore, fallback to liveText */ }

      voice.setVoiceState('idle');
      if (voice.liveText.trim()) {
        send(voice.liveText.trim());
        voice.setLiveText('');
      }
    } else if (voice.voiceState === 'idle') {
      try {
        await voice.startRecording();
      } catch {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      }
    }
  }, [voice, send]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleClear = () => { setMessages([INITIAL_MESSAGE]); setActiveTopic(null); setConversationId(null); };

  const topicData = activeTopic ? TOPICS[activeTopic] : null;
  const isRecording = voice.voiceState === 'recording';

  return (
    <div style={{
      background: css.card, borderRadius: 16,
      border: `1px solid ${css.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 800,
    }}>
      <style>{`
        @keyframes chatBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes chatSpin { to{transform:rotate(360deg)} }
        @keyframes voicePulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.05)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${css.border}`, background: css.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 10px ${C.indigo}40` }}>
            <Brain size={17} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0, letterSpacing: '-0.01em' }}>Decision Advisor</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRecording ? C.rose : C.emerald, display: 'inline-block', animation: 'chatBounce 2s ease infinite' }} />
              <span style={{ fontSize: 11, color: css.mutedFg, fontWeight: 500 }}>
                {isRecording ? 'Listening…' : 'Live business context · Voice enabled'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* TTS toggle */}
          <button onClick={() => { tts.stopSpeaking(); tts.setTtsEnabled(p => !p); }}
            title={tts.ttsEnabled ? 'Disable voice response' : 'Enable voice response'}
            style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${css.border}`, background: tts.ttsEnabled ? `${C.teal}12` : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tts.ttsEnabled ? C.teal : css.mutedFg }}>
            {tts.ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, color: C.indigo, background: `${C.indigo}12`, border: `1px solid ${C.indigo}25`, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={10} />AI + Voice
          </span>
          <button onClick={handleClear} title="New conversation" style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${css.border}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Topic filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderBottom: `1px solid ${css.border}`, overflowX: 'auto', background: css.muted + '30' }}>
        <button onClick={() => setActiveTopic(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${!activeTopic ? C.indigo + '40' : 'transparent'}`, background: !activeTopic ? `${C.indigo}10` : 'transparent', color: !activeTopic ? C.indigo : css.mutedFg, flexShrink: 0 }}>
          <Activity size={12} />All
        </button>
        {Object.entries(TOPICS).map(([key, t]) => {
          const active = activeTopic === key;
          const Icon = t.icon;
          return (
            <button key={key} onClick={() => setActiveTopic(active ? null : key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${active ? t.accent + '40' : 'transparent'}`, background: active ? `${t.accent}10` : 'transparent', color: active ? t.accent : css.mutedFg, flexShrink: 0 }}>
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Topic quick questions ── */}
      {topicData && (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${css.border}`, background: `${topicData.accent}06` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: topicData.accent, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <topicData.icon size={12} />{topicData.label}
            </p>
            <button onClick={() => setActiveTopic(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: css.mutedFg, padding: 2 }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topicData.questions.map((q, i) => (
              <button key={i} onClick={() => { send(q); setActiveTopic(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, border: `1px solid ${topicData.accent}20`, background: css.card, cursor: 'pointer', fontSize: 12, color: css.cardFg, textAlign: 'left' }}>
                <ChevronRight size={11} style={{ color: topicData.accent, flexShrink: 0 }} />{q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {loadingHistory ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: css.mutedFg, fontSize: 13 }}>
            <Loader size={16} style={{ animation: 'chatSpin 1s linear infinite', marginRight: 8 }} />
            Loading conversation history…
          </div>
        ) : (
          messages.map(msg =>
            msg.loading
              ? <TypingIndicator key={msg.id} phrase={loadingPhrase} />
              : <MessageBubble key={msg.id} message={msg} onFollowup={send} onSpeak={tts.speak} isSpeaking={tts.isSpeaking} />
          )
        )}
        {sending && <TypingIndicator phrase={loadingPhrase} />}
        <div ref={bottomRef} />
      </div>

      {/* ── Voice recording indicator ── */}
      {isRecording && (
        <div style={{ padding: '10px 16px', background: `${C.rose}08`, borderTop: `1px solid ${C.rose}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.rose, animation: 'chatBounce 0.8s ease infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.rose }}>Recording</span>
          </div>
          <WaveformBar levels={voice.audioLevels} />
          {voice.liveText && (
            <p style={{ fontSize: 12, color: css.mutedFg, flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>
              "{voice.liveText}"
            </p>
          )}
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${css.border}`, background: css.card }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* Voice button */}
          <VoiceButton
            voiceState={voice.voiceState}
            audioLevels={voice.audioLevels}
            onClick={handleVoice}
          />

          {/* Text input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={isRecording ? (voice.liveText || '') : input}
              onChange={e => { if (!isRecording) { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; } }}
              onKeyDown={handleKey}
              placeholder={isRecording ? 'Listening… speak your question' : 'Ask a business question or press the mic…'}
              disabled={sending || isRecording}
              style={{
                width: '100%', resize: 'none', height: 44, maxHeight: 120, overflowY: 'auto',
                padding: '11px 14px', borderRadius: 12,
                border: `1px solid ${isRecording ? C.rose + '60' : css.border}`,
                background: isRecording ? `${C.rose}04` : css.muted + '60',
                color: css.cardFg, fontSize: 13, lineHeight: 1.5,
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { if (!isRecording) e.target.style.borderColor = C.indigo; }}
              onBlur={e => { if (!isRecording) e.target.style.borderColor = css.border; }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => isRecording ? handleVoice() : send(input)}
            disabled={(!input.trim() && !isRecording) || sending || voice.voiceState === 'processing'}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: isRecording ? `linear-gradient(135deg, ${C.rose}, ${C.orange})` :
                          (!input.trim() || sending) ? css.muted :
                          `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
              color: ((!input.trim() && !isRecording) || sending) ? css.mutedFg : '#fff',
              cursor: ((!input.trim() && !isRecording) || sending) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.15s',
              boxShadow: isRecording ? `0 3px 10px ${C.rose}40` :
                         (!input.trim() || sending) ? 'none' : `0 3px 10px ${C.indigo}40`,
            }}>
            {voice.voiceState === 'processing'
              ? <Loader size={16} style={{ animation: 'chatSpin 1s linear infinite' }} />
              : isRecording
              ? <Send size={16} />
              : sending
              ? <Loader size={16} style={{ animation: 'chatSpin 1s linear infinite' }} />
              : <Send size={16} />}
          </button>
        </div>
        <p style={{ fontSize: 10, color: css.mutedFg, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
          Enter to send · Shift+Enter for new line · Mic for voice input · "Why?" to trace AI reasoning
        </p>
      </div>
    </div>
  );
}