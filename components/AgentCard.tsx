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

// ─── Category visual config ────────────────────────────────────────────────
type CategoryConfig = {
  label: string;
  pillClass: string;
  icon: React.ElementType;
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  assessment: {
    label: 'Assessment',
    pillClass:
      'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    icon: Brain,
  },
  coaching: {
    label: 'Coaching',
    pillClass:
      'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: Target,
  },
  'self-awareness': {
    label: 'Self-Awareness',
    pillClass:
      'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    icon: Compass,
  },
  strategy: {
    label: 'Strategy',
    pillClass:
      'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    icon: RefreshCcw,
  },
  accountability: {
    label: 'Accountability',
    pillClass:
      'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    icon: Calendar,
  },
  content: {
    label: 'Content',
    pillClass:
      'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
    icon: Radio,
  },
  admin: {
    label: 'Admin',
    pillClass:
      'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: Rocket,
  },
};

const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  label: 'General',
  pillClass:
    'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
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
  color = 'bg-gray-500',
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

  // ── Border ──
  const baseBorder = locked
    ? 'border-gray-200 dark:border-white/[0.06]'
    : isFree
    ? 'border-amber-300 dark:border-amber-500/50'
    : premium
    ? 'border-purple-200 dark:border-purple-700/60'
    : 'border-gray-200 dark:border-white/[0.08]';

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
      className={`group relative flex flex-col bg-white dark:bg-[#111827] rounded-2xl border-2 transition-all duration-300 overflow-hidden ${baseBorder} ${
        locked ? 'opacity-60 cursor-default' : 'cursor-pointer'
      }`}
      style={hoverStyle}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={locked ? undefined : isVoice ? () => setShowVoiceChat(true) : handleStartChat}
    >
      {/* Top accent bar */}
      <div className="h-[3px] w-full flex-shrink-0" style={{ backgroundColor: accent_color }} />

      {/* Free entry glow ring */}
      {isFree && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none ring-2 ring-amber-400/30 dark:ring-amber-500/20" />
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
        <div className="flex items-center justify-between mb-4 gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border leading-none ${cat.pillClass}`}
          >
            <CatIcon className="w-3 h-3 flex-shrink-0" />
            {cat.label}
          </span>

          {isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600/60 rounded-full text-[11px] font-bold leading-none flex-shrink-0">
              <Star className="w-3 h-3 fill-current" />
              Free
            </span>
          )}

          {premium && !isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60 rounded-full text-[11px] font-bold leading-none flex-shrink-0">
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
            <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white leading-snug line-clamp-2">
              {name}
            </h3>
            {popularity > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                <span className="text-[10px] text-gray-400 dark:text-gray-600">
                  {popularity.toLocaleString()} sessions
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: description */}
        <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed line-clamp-3 flex-1 mb-5">
          {description}
        </p>

        {/* Row 4: CTA */}
        <div className="mt-auto space-y-2">
          {locked ? (
            <>
              <div className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.05] text-gray-400 dark:text-gray-600 font-medium rounded-xl flex items-center justify-center gap-2 text-xs border border-gray-200 dark:border-white/[0.06]">
                <Lock className="w-3.5 h-3.5" />
                {lockedReason || 'Locked'}
              </div>
              <a
                href="https://www.mindset.show"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-full px-3 py-1.5 text-amber-700 dark:text-amber-400 font-semibold rounded-xl border border-amber-300 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center justify-center gap-1 text-xs transition-colors"
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
            <button className="w-full px-3 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md hover:shadow-amber-400/25 hover:-translate-y-px group/btn">
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
        <div className="absolute inset-0 bg-white/20 dark:bg-gray-900/20 rounded-2xl pointer-events-none" />
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
