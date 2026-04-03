'use client';

import { useState } from 'react';
import {
  MessageSquare,
  TrendingUp,
  Mic,
  Lock,
  ArrowUpRight,
  Crown,
  Star,
  Brain,
  Target,
  Compass,
  RefreshCcw,
  Calendar,
  Radio,
  Rocket,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore, AgentId, MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';
import dynamic from 'next/dynamic';

const VoiceChatLive = dynamic(() => import('./VoiceChatLive'), { ssr: false });

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  bg:        '#09090f',
  card:      'rgba(18,18,31,0.8)',
  border:    '#1e1e30',
  primary:   '#ededf5',
  muted:     '#9090a8',
  dim:       '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  amberBg:   'rgba(252,200,36,0.12)',
  amberBd:   'rgba(252,200,36,0.35)',
  purple:    '#7c5bf6',
  purpleBg:  'rgba(124,91,246,0.12)',
  purpleBd:  'rgba(124,91,246,0.35)',
} as const;

// ─── Category visual config ────────────────────────────────────────────────
type CategoryConfig = {
  label: string;
  pillStyle: React.CSSProperties;
  icon: React.ElementType;
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  assessment: {
    label: 'Assessment',
    pillStyle: {
      background: 'rgba(124,91,246,0.12)',
      color: '#a78bfa',
      borderColor: 'rgba(124,91,246,0.35)',
    },
    icon: Brain,
  },
  coaching: {
    label: 'Coaching',
    pillStyle: {
      background: 'rgba(79,110,247,0.12)',
      color: '#818cf8',
      borderColor: 'rgba(79,110,247,0.35)',
    },
    icon: Target,
  },
  'self-awareness': {
    label: 'Self-Awareness',
    pillStyle: {
      background: 'rgba(20,184,166,0.12)',
      color: '#2dd4bf',
      borderColor: 'rgba(20,184,166,0.35)',
    },
    icon: Compass,
  },
  strategy: {
    label: 'Strategy',
    pillStyle: {
      background: 'rgba(249,115,22,0.12)',
      color: '#fb923c',
      borderColor: 'rgba(249,115,22,0.35)',
    },
    icon: RefreshCcw,
  },
  accountability: {
    label: 'Accountability',
    pillStyle: {
      background: 'rgba(34,197,94,0.12)',
      color: '#4ade80',
      borderColor: 'rgba(34,197,94,0.35)',
    },
    icon: Calendar,
  },
  content: {
    label: 'Content',
    pillStyle: {
      background: 'rgba(236,72,153,0.12)',
      color: '#f472b6',
      borderColor: 'rgba(236,72,153,0.35)',
    },
    icon: Radio,
  },
  admin: {
    label: 'Admin',
    pillStyle: {
      background: 'rgba(148,163,184,0.10)',
      color: '#94a3b8',
      borderColor: 'rgba(148,163,184,0.25)',
    },
    icon: Rocket,
  },
};

const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  label: 'General',
  pillStyle: {
    background: 'rgba(144,144,168,0.10)',
    color: T.muted,
    borderColor: 'rgba(144,144,168,0.25)',
  },
  icon: BookOpen,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function isPremiumAgent(id: string) {
  return id === 'architecture-coach' || id === 'launch-companion';
}
function isFreeEntryAgent(id: string) {
  return id === 'mindset-score';
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  accent_color?: string;
  category?: string;
  tags?: ('popular' | 'new' | 'workflow' | 'advanced' | 'quick-win' | 'content' | 'lead-gen' | 'voice' | 'trial')[];
  popularity?: number;
  workflowStep?: number;
  isVoiceAgent?: boolean;
  locked?: boolean;
  lockedReason?: string | null;
  isTrialAgent?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AgentCard({
  id,
  name,
  description,
  icon,
  color = '#6b7280',
  accent_color = '#3B82F6',
  category,
  tags = [],
  popularity = 0,
  workflowStep,
  isVoiceAgent = false,
  locked = false,
  lockedReason = null,
  isTrialAgent = false,
}: AgentCardProps) {
  const router = useRouter();
  const { setCurrentAgent, createConversation, setCurrentConversation, user } = useAppStore();
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isVoice = isVoiceAgent || id === 'voice-expert' || id === 'sales-roleplay-coach';
  const isFree = isFreeEntryAgent(id);
  const premium = isPremiumAgent(id);

  const catKey = (category || '').toLowerCase().replace(/\s+/g, '-');
  const cat = CATEGORY_CONFIG[catKey] || DEFAULT_CATEGORY_CONFIG;
  const CatIcon = cat.icon;

  const handleStartChat = () => {
    setCurrentAgent(id as AgentId);
    const agentData = MINDSET_AGENTS[id as AgentId];
    const backendId = agentData?.id || id;
    setTimeout(() => {
      const newConvId = createConversation(backendId);
      setCurrentConversation(newConvId);
      router.push('/dashboard');
    }, 50);
  };

  // ── Border colour (inline) ──
  const borderColor = locked
    ? T.border
    : isFree
    ? T.amberBd
    : premium
    ? T.purpleBd
    : T.border;

  const hoverStyle =
    hovered && !locked
      ? {
          borderColor: accent_color,
          boxShadow: `0 8px 28px -6px ${accent_color}30`,
          transform: 'translateY(-2px)',
        }
      : {};

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
        locked ? 'opacity-60 cursor-default' : 'cursor-pointer'
      }`}
      style={{
        background: T.card,
        borderColor,
        ...hoverStyle,
      }}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={locked ? undefined : isVoice ? () => setShowVoiceChat(true) : handleStartChat}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: accent_color }} />

      {/* Free entry glow ring */}
      {isFree && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 2px rgba(252,200,36,0.30)` }}
        />
      )}

      {/* Premium hover gradient */}
      {premium && hovered && !locked && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${accent_color}10, transparent 55%)` }}
        />
      )}

      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300 opacity-0 group-hover:opacity-100"
        style={{ background: `linear-gradient(145deg, ${accent_color}06, ${accent_color}0d)` }}
      />

      {/* Card body */}
      <div className="relative flex flex-col flex-1 p-5">
        {/* Row 1: category pill + premium/free badge */}
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border leading-none"
            style={cat.pillStyle}
          >
            <CatIcon className="w-3 h-3 flex-shrink-0" />
            {cat.label}
          </span>

          {isFree && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold leading-none flex-shrink-0"
              style={{
                background: T.amberBg,
                color: T.amber,
                border: `1px solid ${T.amberBd}`,
              }}
            >
              <Star className="w-3 h-3 fill-current" />
              Free
            </span>
          )}

          {premium && !isFree && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold leading-none flex-shrink-0"
              style={{
                background: T.purpleBg,
                color: T.purple,
                border: `1px solid ${T.purpleBd}`,
              }}
            >
              <Crown className="w-3 h-3" />
              Premium
            </span>
          )}
        </div>

        {/* Row 2: icon + name + usage */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${accent_color}1a, ${accent_color}08)`,
              border: `1.5px solid ${accent_color}30`,
              boxShadow: `0 2px 12px ${accent_color}18`,
            }}
          >
            <AgentIcon agentId={icon || id} className="w-6 h-6" style={{ color: accent_color }} />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              className="text-sm font-bold tracking-tight leading-snug line-clamp-2"
              style={{ color: T.primary }}
            >
              {name}
            </h3>
            {popularity > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" style={{ color: T.dim }} />
                <span className="text-[10px]" style={{ color: T.dim }}>
                  {popularity.toLocaleString()} sessions
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: description */}
        <p
          className="text-xs leading-relaxed line-clamp-3 flex-1 mb-5"
          style={{ color: T.muted }}
        >
          {description}
        </p>

        {/* Row 4: CTA */}
        <div className="mt-auto space-y-2">
          {locked ? (
            <>
              <div
                className="w-full px-3 py-2 font-medium rounded-xl flex items-center justify-center gap-2 text-xs"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  color: T.dim,
                  border: `1px solid ${T.border}`,
                }}
              >
                <Lock className="w-3.5 h-3.5" />
                {lockedReason || 'Locked'}
              </div>
              <a
                href="https://www.mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-1.5 font-semibold rounded-xl flex items-center justify-center gap-1 text-xs transition-colors"
                style={{
                  color: T.amber,
                  border: `1px solid ${T.amberBd}`,
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = T.amberBg;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                Unlock Access
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </>
          ) : isVoice ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVoiceChat(true);
              }}
              className="w-full px-3 py-2.5 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md hover:-translate-y-px"
              style={{ backgroundColor: accent_color }}
            >
              <Mic className="w-3.5 h-3.5" />
              Start Voice Session
            </button>
          ) : isFree ? (
            <button
              className="w-full px-3 py-2.5 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:-translate-y-px group/btn"
              style={{
                background: T.amber,
                color: '#09090f',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(252,200,36,0.85)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = T.amber;
              }}
            >
              <Star className="w-3.5 h-3.5 fill-current flex-shrink-0" />
              <span>Start Free</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto transition-transform duration-200 group-hover/btn:translate-x-0.5 flex-shrink-0" />
            </button>
          ) : (
            <button
              className="w-full px-3 py-2.5 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm group/btn hover:-translate-y-px"
              style={{
                backgroundColor: hovered ? accent_color : 'transparent',
                color: hovered ? '#fff' : accent_color,
                border: `1.5px solid ${accent_color}`,
                boxShadow: hovered ? `0 4px 14px ${accent_color}30` : undefined,
              }}
            >
              <MessageSquare
                className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: hovered ? '#fff' : accent_color }}
              />
              <span>{isTrialAgent ? 'Start Trial Chat' : 'Start Chat'}</span>
              <ChevronRight
                className="w-3.5 h-3.5 ml-auto transition-transform duration-200 group-hover/btn:translate-x-0.5 flex-shrink-0"
                style={{ color: hovered ? '#fff' : accent_color }}
              />
            </button>
          )}
        </div>
      </div>

      {/* Lock overlay */}
      {locked && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: 'rgba(9,9,15,0.20)' }}
        />
      )}

      {/* Voice modal */}
      {showVoiceChat && user && (
        <VoiceChatLive
          agentId={id}
          agentName={name}
          accentColor={accent_color}
          onClose={() => setShowVoiceChat(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
