/**
 * AIChat.tsx — Decision Advisor v3.0
 * Pro redesign matching DashboardPage aesthetic.
 *
 * Design principles:
 *  - Same cardStyle, palette (C.*), css vars as Dashboard
 *  - No emojis anywhere — Lucide icons only
 *  - Refined typography: 10px/700 uppercase labels, 13px body
 *  - Messages: clean bubbles with subtle gradients, no emoji icons
 *  - Decision cards: structured, banking-grade layout
 *  - Topic pills: monochrome badges with accent underline
 *  - Input: floating, minimal, professional
 */

import {
  Sparkles, Send, ChevronRight, ThumbsUp, ThumbsDown,
  Brain, CheckCircle, Clock, User, RefreshCw, Zap,
  TrendingUp, Package, Users, BarChart3, DollarSign,
  AlertTriangle, ArrowRight, Loader, MessageSquare,
  Activity, Target, X,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// Design system — mirrors DashboardPage exactly
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

interface DecisionOption { label: string; pros: string; cons: string; }
interface DecisionCard {
  question: string; recommendation: string; rationale: string;
  options: DecisionOption[]; owner: string; deadline: string;
}
export interface ChatMessage {
  id: string; role: Role; content: string; time: string;
  loading?: boolean; error?: boolean; fallback?: boolean;
  decision_needed?: boolean; decision_card?: DecisionCard | null;
  suggested_followups?: string[]; urgency?: Urgency; topic?: Topic;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const uid = () => Math.random().toString(36).slice(2);

const INITIAL_MESSAGE: ChatMessage = {
  id: 'init', role: 'ai', content:
    "Hello. I have real-time access to your receivables, churn signals, stock levels, anomalies, seasonal data, and revenue forecast.\n\nAsk any business question — I'll provide a clear recommendation with exact figures, and suggest what to explore next.",
  time: now(),
  suggested_followups: [
    "What are my most critical business risks right now?",
    "Which customers should I contact today and why?",
    "Do I need to make any urgent stock decisions?",
  ],
  topic: 'general', urgency: 'low',
};

// Topic definitions — icons only, no emojis
const TOPICS: Record<string, { label: string; icon: React.ElementType; accent: string; questions: string[] }> = {
  credit: {
    label: 'Receivables', icon: DollarSign, accent: C.orange,
    questions: [
      "Who are my top overdue accounts and how much do they owe?",
      "Should I suspend credit for any customer?",
      "What is my current DSO and how can I improve it?",
      "How much cash can I realistically collect this month?",
    ],
  },
  churn: {
    label: 'Retention', icon: Users, accent: C.violet,
    questions: [
      "Which customers are most likely to churn and why?",
      "What should I say when I call a high-risk customer?",
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
      "Am I prepared for the upcoming peak season?",
    ],
  },
  forecast: {
    label: 'Forecast', icon: TrendingUp, accent: C.emerald,
    questions: [
      "What is my revenue outlook for the next 3 months?",
      "What is the main risk to my forecast?",
      "How does my forecast compare to last year?",
      "What should I do to hit my best-case scenario?",
    ],
  },
  revenue: {
    label: 'Revenue', icon: BarChart3, accent: C.indigo,
    questions: [
      "Which products and customers drive most of my margin?",
      "Where am I leaving money on the table?",
      "What is my revenue trend this year?",
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
  credit:   { color: C.orange,  label: 'Receivables' },
  stock:    { color: C.cyan,    label: 'Stock' },
  churn:    { color: C.violet,  label: 'Retention' },
  forecast: { color: C.emerald, label: 'Forecast' },
  revenue:  { color: C.indigo,  label: 'Revenue' },
  general:  { color: css.mutedFg, label: 'General' },
};

const LOADING_PHRASES = [
  "Analyzing your business data",
  "Checking receivables and churn signals",
  "Reviewing stock levels and forecasts",
  "Preparing your recommendation",
  "Cross-referencing KPIs",
];

interface StoredConversationSummary { id: string; title: string; created_at: string; updated_at: string; }
interface StoredConversationMessage {
  id: string; role: 'user' | 'assistant'; content: string;
  metadata?: { decision_needed?: boolean; decision_card?: DecisionCard | null; suggested_followups?: string[]; urgency?: Urgency; topic?: Topic; fallback?: boolean; };
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Decision Card component
// ─────────────────────────────────────────────────────────────────────────────

function DecisionCardView({ card, onSelectOption }: { card: DecisionCard; onSelectOption: (q: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div style={{ marginTop: 14, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.indigo}30` }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Brain size={13} color="rgba(255,255,255,0.8)" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>Decision Required</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4 }}>{card.question}</p>
      </div>

      {/* Recommendation */}
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

      {/* Options */}
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
                  transition: 'all 0.15s',
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

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: css.muted + '40' }}>
        {card.owner && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: css.mutedFg }}>
            <User size={11} /><span style={{ fontWeight: 600 }}>{card.owner}</span>
          </span>
        )}
        {card.deadline && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: css.mutedFg }}>
            <Clock size={11} />{card.deadline}
          </span>
        )}
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
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={13} color="#fff" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, borderTopLeftRadius: 4, background: css.muted + '80', maxWidth: 280 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: C.indigo,
              animation: `chatBounce 1.2s infinite ${i * 0.2}s`,
            }} />
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

function MessageBubble({ message, onFollowup }: { message: ChatMessage; onFollowup: (q: string) => void }) {
  const isUser = message.role === 'user';

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
            <div style={{
              padding: '10px 16px', borderRadius: 16, borderBottomRightRadius: 4,
              background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
              color: '#fff', fontSize: 13, lineHeight: 1.55,
            }}>
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

  const urgency = message.urgency || 'low';
  const topic   = message.topic;
  const urgencyCfg = URGENCY_CONFIG[urgency];
  const topicCfg   = topic ? TOPIC_CONFIG[topic] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, maxWidth: '92%' }}>
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
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
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: urgencyCfg.color, flexShrink: 0 }} />
                  {urgencyCfg.label}
                </span>
              )}
              {message.fallback && (
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, color: C.amber, background: `${C.amber}12`, border: `1px solid ${C.amber}25` }}>offline</span>
              )}
            </div>
          )}

          {/* Bubble */}
          <div style={{
            padding: '12px 16px', borderRadius: 16, borderTopLeftRadius: 4,
            background: css.muted + '60', fontSize: 13, color: css.cardFg, lineHeight: 1.6,
            border: `1px solid ${css.border}`,
          }}>
            {renderContent(message.content)}
            {message.decision_card && (
              <DecisionCardView card={message.decision_card} onSelectOption={onFollowup} />
            )}
          </div>

          {/* Suggested followups */}
          {message.suggested_followups && message.suggested_followups.length > 0 && !message.loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: css.mutedFg, margin: 0 }}>Continue</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {message.suggested_followups.map((q, i) => (
                  <button key={i} onClick={() => onFollowup(q)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
                    border: `1px solid ${css.border}`, background: css.card, cursor: 'pointer',
                    fontSize: 12, color: css.cardFg, textAlign: 'left', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.indigo; (e.currentTarget as HTMLButtonElement).style.background = `${C.indigo}06`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = css.border; (e.currentTarget as HTMLButtonElement).style.background = css.card; }}
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
// Main AIChat component
// ─────────────────────────────────────────────────────────────────────────────

interface AIChatProps { className?: string; }

export function AIChat({ className = '' }: AIChatProps) {
  const [messages,      setMessages]      = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input,         setInput]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [activeTopic,   setActiveTopic]   = useState<string | null>(null);
  const [conversationId,setConversationId]= useState<string | null>(null);
  const [loadingHistory,setLoadingHistory]= useState(true);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const phraseCycle = useRef(0);

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
        if (!latest) { if (mounted) { setMessages([INITIAL_MESSAGE]); setConversationId(null); } return; }
        const hist = await api.get<{ count: number; messages: StoredConversationMessage[] }>(`/ai-insights/conversations/${latest.id}/messages/`);
        const mapped = (hist.messages || []).map((m): ChatMessage => ({
          id: m.id, role: m.role === 'assistant' ? 'ai' : 'user', content: m.content,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          decision_needed: m.metadata?.decision_needed, decision_card: m.metadata?.decision_card ?? null,
          suggested_followups: m.metadata?.suggested_followups, urgency: m.metadata?.urgency,
          topic: m.metadata?.topic, fallback: m.metadata?.fallback,
        }));
        if (mounted) { setConversationId(latest.id); setMessages(mapped.length ? mapped : [INITIAL_MESSAGE]); }
      } catch { if (mounted) { setMessages([INITIAL_MESSAGE]); setConversationId(null); } }
      finally { if (mounted) setLoadingHistory(false); }
    })();
    return () => { mounted = false; };
  }, []);

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
      setMessages(prev => [...prev, {
        id: uid(), role: 'ai', content: res.answer, time: now(),
        decision_needed: res.decision_needed, decision_card: res.decision_card,
        suggested_followups: res.suggested_followups, urgency: res.urgency,
        topic: res.topic, fallback: res.fallback,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: uid(), role: 'ai', content: "I'm temporarily unavailable. Please check your dashboard panels for real-time data.",
        time: now(), error: true,
        suggested_followups: ["What are my top business risks?", "Which customers need urgent attention?", "What is my revenue outlook?"],
      }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending, conversationId]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const handleClear = () => { setMessages([INITIAL_MESSAGE]); setActiveTopic(null); setConversationId(null); };

  const topicData = activeTopic ? TOPICS[activeTopic] : null;

  return (
    <div style={{
      background: css.card,
      borderRadius: 16,
      border: `1px solid ${css.border}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 20px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: 740,
    }}>
      <style>{`
        @keyframes chatBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes chatSpin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${css.border}`,
        background: css.card,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo mark */}
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 3px 10px ${C.indigo}40`,
          }}>
            <Brain size={17} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: css.cardFg, margin: 0, letterSpacing: '-0.01em' }}>Decision Advisor</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald, display: 'inline-block', animation: 'chatBounce 2s ease infinite' }} />
              <span style={{ fontSize: 11, color: css.mutedFg, fontWeight: 500 }}>Live business context</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* AI badge */}
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, color: C.indigo, background: `${C.indigo}12`, border: `1px solid ${C.indigo}25`, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={10} />AI
          </span>
          <button onClick={handleClear} title="New conversation" style={{
            width: 32, height: 32, borderRadius: 9, border: `1px solid ${css.border}`,
            background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: css.mutedFg,
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Topic filter bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
        borderBottom: `1px solid ${css.border}`, overflowX: 'auto',
        background: css.muted + '30',
      }}>
        <button onClick={() => setActiveTopic(null)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          border: `1px solid ${!activeTopic ? C.indigo + '40' : 'transparent'}`,
          background: !activeTopic ? `${C.indigo}10` : 'transparent',
          color: !activeTopic ? C.indigo : css.mutedFg, flexShrink: 0,
        }}>
          <Activity size={12} />All
        </button>
        {Object.entries(TOPICS).map(([key, t]) => {
          const active = activeTopic === key;
          const Icon = t.icon;
          return (
            <button key={key} onClick={() => setActiveTopic(active ? null : key)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active ? t.accent + '40' : 'transparent'}`,
              background: active ? `${t.accent}10` : 'transparent',
              color: active ? t.accent : css.mutedFg, flexShrink: 0,
            }}>
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>

      {/* ── Topic quick questions ── */}
      {topicData && (
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${css.border}`,
          background: `${topicData.accent}06`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: topicData.accent, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <topicData.icon size={12} />{topicData.label} — Common decisions
            </p>
            <button onClick={() => setActiveTopic(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: css.mutedFg, padding: 2 }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topicData.questions.map((q, i) => (
              <button key={i} onClick={() => { send(q); setActiveTopic(null); }} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 9, border: `1px solid ${topicData.accent}20`,
                background: css.card, cursor: 'pointer', fontSize: 12, color: css.cardFg, textAlign: 'left',
              }}>
                <ChevronRight size={11} style={{ color: topicData.accent, flexShrink: 0 }} />
                {q}
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
          messages.map(msg => (
            msg.loading
              ? <TypingIndicator key={msg.id} phrase={loadingPhrase} />
              : <MessageBubble key={msg.id} message={msg} onFollowup={send} />
          ))
        )}
        {sending && <TypingIndicator phrase={loadingPhrase} />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${css.border}`, background: css.card }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={handleKey}
              placeholder="Ask a business question — I'll give you a recommendation…"
              disabled={sending}
              style={{
                width: '100%', resize: 'none', height: 44, maxHeight: 120, overflowY: 'auto',
                padding: '11px 14px', borderRadius: 12,
                border: `1px solid ${css.border}`, background: css.muted + '60',
                color: css.cardFg, fontSize: 13, lineHeight: 1.5,
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = C.indigo)}
              onBlur={e => (e.target.style.borderColor = css.border)}
            />
          </div>
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || sending}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: !input.trim() || sending ? css.muted : `linear-gradient(135deg, ${C.indigo}, ${C.violet})`,
              color: !input.trim() || sending ? css.mutedFg : '#fff',
              cursor: !input.trim() || sending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
              boxShadow: !input.trim() || sending ? 'none' : `0 3px 10px ${C.indigo}40`,
            }}>
            {sending
              ? <Loader size={16} style={{ animation: 'chatSpin 1s linear infinite' }} />
              : <Send size={16} />}
          </button>
        </div>
        <p style={{ fontSize: 10, color: css.mutedFg, textAlign: 'center', marginTop: 8, marginBottom: 0, letterSpacing: '0.03em' }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}