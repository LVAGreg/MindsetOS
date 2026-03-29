'use client';

import { useState } from 'react';
import { MessageSquare, Sparkles, TrendingUp, Zap, Mic, Lock, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppStore, AgentId, MINDSET_AGENTS } from '@/lib/store';
import { AgentIcon } from '@/lib/agent-icons';
import dynamic from 'next/dynamic';

// Dynamically import VoiceChatLive for real-time Gemini voice
const VoiceChatLive = dynamic(() => import('./VoiceChatLive'), { ssr: false });

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  accent_color?: string;
  tags?: ('popular' | 'new' | 'workflow' | 'advanced' | 'quick-win' | 'content' | 'lead-gen' | 'voice' | 'trial')[];
  popularity?: number;
  workflowStep?: number;
  isVoiceAgent?: boolean;
  locked?: boolean;
  lockedReason?: string | null;
  isTrialAgent?: boolean;
}

export default function AgentCard({
  id,
  name,
  description,
  icon,
  color = 'bg-gray-500',
  accent_color = '#3B82F6',
  tags = [],
  popularity = 0,
  workflowStep,
  isVoiceAgent = false,
  locked = false,
  lockedReason = null,
  isTrialAgent = false
}: AgentCardProps) {
  const router = useRouter();
  const { setCurrentAgent, createConversation, setCurrentConversation, user } = useAppStore();
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  // Check if this is a voice agent
  const isVoice = isVoiceAgent || id === 'voice-expert' || id === 'sales-roleplay-coach';

  const handleStartChat = () => {
    // Set agent first and wait for state update before navigation
    setCurrentAgent(id as AgentId);

    // Convert to backend ID for conversation creation
    const agentData = MINDSET_AGENTS[id as AgentId];
    const backendId = agentData?.id || id;

    // Small delay to ensure Zustand state is persisted before navigation
    setTimeout(() => {
      const newConvId = createConversation(backendId);
      setCurrentConversation(newConvId);
      router.push('/dashboard');
    }, 50);
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'popular':
        return <TrendingUp className="w-3 h-3" />;
      case 'new':
        return <Sparkles className="w-3 h-3" />;
      case 'quick-win':
        return <Zap className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getTagStyle = (tag: string) => {
    switch (tag) {
      case 'popular':
        return 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20';
      case 'new':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'workflow':
        return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'advanced':
        return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      case 'quick-win':
        return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'content':
        return 'bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-500/20';
      case 'lead-gen':
        return 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
      case 'trial':
        return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/20';
      default:
        return 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.08]';
    }
  };

  const getTagLabel = (tag: string) => {
    switch (tag) {
      case 'popular':
        return 'Popular';
      case 'new':
        return 'New';
      case 'workflow':
        return 'Core Workflow';
      case 'advanced':
        return 'Advanced';
      case 'quick-win':
        return 'Quick Win';
      case 'content':
        return 'Content Creation';
      case 'lead-gen':
        return 'Lead Generation';
      case 'trial':
        return 'Free Trial';
      default:
        return tag;
    }
  };

  return (
    <div
      className={`group relative rounded-xl p-4 border transition-all duration-300 ${
        locked
          ? 'bg-white dark:bg-[#111827] border-gray-200 dark:border-white/[0.06] opacity-60 cursor-default'
          : isTrialAgent
            ? 'bg-white dark:bg-[#111827] border-amber-300 dark:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-0.5 cursor-pointer ring-1 ring-amber-200 dark:ring-amber-500/20'
            : 'bg-white dark:bg-[#111827] border-gray-200 dark:border-white/[0.08] hover:shadow-xl dark:hover:shadow-black/40 hover:-translate-y-0.5 cursor-pointer'
      }`}
      style={{
        '--accent-color': accent_color,
      } as React.CSSProperties}
      onMouseEnter={(e) => {
        if (!locked) {
          e.currentTarget.style.borderColor = accent_color;
          e.currentTarget.style.boxShadow = `0 10px 40px -15px ${accent_color}40`;
        }
      }}
      onMouseLeave={(e) => {
        if (!locked) {
          e.currentTarget.style.borderColor = isTrialAgent ? '' : '';
          e.currentTarget.style.boxShadow = '';
        }
      }}
    >
      {/* Tags */}
      {tags.length > 0 && (
        <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end max-w-[100px]">
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getTagStyle(tag)}`}
            >
              {getTagIcon(tag)}
              {getTagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {/* Workflow Step Badge */}
      {workflowStep && (
        <div className="absolute top-2 left-2 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
          {workflowStep}
        </div>
      )}

      {/* Agent Icon */}
      <div className="flex flex-col items-center text-center mt-4 mb-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${accent_color}18, ${accent_color}08)`,
            border: `1.5px solid ${accent_color}35`,
            boxShadow: `0 4px 16px ${accent_color}15`,
          }}
        >
          <AgentIcon agentId={id} className="w-7 h-7" style={{ color: accent_color }} />
        </div>

        {/* Agent Name */}
        <h3 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white mb-1.5 line-clamp-2 leading-snug">
          {name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-3 min-h-[32px] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        {locked ? (
          <>
            <div className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-lg flex items-center justify-center gap-1.5 text-sm">
              <Lock className="w-3.5 h-3.5" />
              Locked
            </div>
            <a
              href="https://www.mindset.show"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3 py-1.5 text-amber-700 dark:text-amber-400 font-medium rounded-lg border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-1 text-xs transition-colors"
            >
              Upgrade to Unlock
              <ArrowUpRight className="w-3 h-3" />
            </a>
          </>
        ) : isVoice ? (
          <button
            onClick={() => setShowVoiceChat(true)}
            className="w-full px-3 py-2 text-white font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-sm"
            style={{ backgroundColor: accent_color }}
          >
            <Mic className="w-3.5 h-3.5" />
            Start Voice Session
          </button>
        ) : (
          <button
            onClick={handleStartChat}
            className="w-full px-3 py-2 bg-[#ffc82c] hover:bg-[#f8c824] text-black font-semibold rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 text-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {isTrialAgent ? 'Start Trial Chat' : 'New Chat'}
          </button>
        )}

        {/* Popularity Indicator */}
        {popularity > 0 && !locked && (
          <div className="text-center text-[10px] text-gray-500 dark:text-gray-400">
            Used by {popularity.toLocaleString()} experts
          </div>
        )}
      </div>

      {/* Lock Overlay for locked agents */}
      {locked && (
        <div className="absolute inset-0 bg-gray-100/30 dark:bg-gray-900/30 rounded-xl pointer-events-none" />
      )}

      {/* Voice Chat Modal - Using Gemini Live for real-time voice */}
      {showVoiceChat && user && (
        <VoiceChatLive
          agentId={id}
          agentName={name}
          accentColor={accent_color}
          onClose={() => setShowVoiceChat(false)}
          userId={user.id}
        />
      )}

      {/* Hover Glow Effect */}
      <div
        className="absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${accent_color}05, ${accent_color}10)`,
        }}
      />
    </div>
  );
}
