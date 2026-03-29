'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, Search, Clock, Zap, Star, Brain, Target, Compass, RefreshCcw, Calendar, Radio, Rocket, BookOpen, ChevronRight } from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import AgentSearchBar from '@/components/AgentSearchBar';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  accent_color?: string;
  category?: string;
  tags: string[];
  popularity: number;
  releaseDate: string;
  isEnabled: boolean;
  workflowStep?: number;
  locked?: boolean;
  lockedReason?: string | null;
  isTrialAgent?: boolean;
}

// Category display order and labels
const CATEGORY_ORDER = [
  'assessment',
  'coaching',
  'self-awareness',
  'strategy',
  'accountability',
  'content',
  'admin',
];

const CATEGORY_LABELS: Record<string, { label: string; description: string; icon: React.ElementType }> = {
  assessment: {
    label: 'Assessment',
    description: 'Measure and map where you are right now.',
    icon: Brain,
  },
  coaching: {
    label: 'Coaching',
    description: 'Build your mindset architecture with guided support.',
    icon: Target,
  },
  'self-awareness': {
    label: 'Self-Awareness',
    description: 'Surface the beliefs and stories running the show.',
    icon: Compass,
  },
  strategy: {
    label: 'Strategy',
    description: 'Make better decisions under pressure.',
    icon: RefreshCcw,
  },
  accountability: {
    label: 'Accountability',
    description: 'Stay consistent when motivation fades.',
    icon: Calendar,
  },
  content: {
    label: 'Content',
    description: 'Find the right conversations for your journey.',
    icon: Radio,
  },
  admin: {
    label: 'Admin',
    description: 'Behind-the-scenes tools for platform management.',
    icon: Rocket,
  },
};

export default function AgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await response.json();
        setAllAgents(data.agents || []);
        setMembershipTier(data.membershipTier || null);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        setAllAgents([]);
        setIsLoading(false);
      }
    }
    fetchAgents();
    setHasHydrated(true);
  }, []);

  // The free entry agent — always pinned at the top
  const freeAgent = useMemo(() => allAgents.find((a) => a.id === 'mindset-score'), [allAgents]);

  // Filtered agents (search + category filter), excluding the hero free agent from the grid
  const filteredAgents = useMemo(() => {
    let filtered = allAgents.filter((a) => a.id !== 'mindset-score');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeFilters.length > 0) {
      filtered = filtered.filter((a) => {
        const catKey = (a.category || '').toLowerCase().replace(/\s+/g, '-');
        return activeFilters.some((f) => f === catKey || a.tags.includes(f as any));
      });
    }

    return filtered;
  }, [allAgents, searchQuery, activeFilters]);

  // Group non-hero agents by category
  const agentsByCategory = useMemo(() => {
    const grouped: Record<string, Agent[]> = {};
    filteredAgents.forEach((agent) => {
      const catKey = (agent.category || 'general').toLowerCase().replace(/\s+/g, '-');
      if (!grouped[catKey]) grouped[catKey] = [];
      grouped[catKey].push(agent);
    });
    return grouped;
  }, [filteredAgents]);

  // Ordered categories (only those that have agents)
  const orderedCategories = useMemo(() => {
    const present = new Set(Object.keys(agentsByCategory));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    // Append any categories not in the ordered list
    Object.keys(agentsByCategory).forEach((c) => {
      if (!ordered.includes(c)) ordered.push(c);
    });
    return ordered;
  }, [agentsByCategory]);

  const isSearching = searchQuery.trim() !== '' || activeFilters.length > 0;

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Page header ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Your Agents
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Each one is built around a specific part of your inner work.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Trial banner ── */}
        {membershipTier === 'trial' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Free Trial — Full Access for 7 Days
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Upgrade any time to remove message limits.
                </p>
              </div>
            </div>
            <a
              href="https://www.mindset.show"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl transition-colors text-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade Now
            </a>
          </div>
        )}

        {/* ── Hero: Mindset Score (free entry point) ── */}
        {!isSearching && freeAgent && (
          <div className="mb-10">
            <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-gray-800/80 dark:to-orange-950/20 rounded-3xl p-8 border-2 border-amber-300 dark:border-amber-600/50 shadow-lg shadow-amber-100/60 dark:shadow-amber-900/20 overflow-hidden">
              {/* Decorative orbs */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/8 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                {/* Left: text */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600/50 rounded-full text-xs font-bold mb-4">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Start Here — It&apos;s Free
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
                    {freeAgent.name}
                  </h2>

                  <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed mb-6 max-w-md">
                    {freeAgent.description}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-6 py-3 bg-amber-400 hover:bg-amber-500 text-black font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:shadow-amber-400/30 hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                    >
                      Take the 5-Question Assessment
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    {freeAgent.popularity > 0 && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                        {freeAgent.popularity.toLocaleString()} sessions
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: visual */}
                <div className="hidden md:flex items-center justify-center">
                  <div
                    className="w-40 h-40 rounded-3xl flex items-center justify-center shadow-2xl shadow-amber-400/20"
                    style={{
                      background: `linear-gradient(135deg, ${freeAgent.accent_color || '#f59e0b'}22, ${freeAgent.accent_color || '#f59e0b'}0a)`,
                      border: `2px solid ${freeAgent.accent_color || '#f59e0b'}35`,
                    }}
                  >
                    <Brain
                      className="w-20 h-20"
                      style={{ color: freeAgent.accent_color || '#f59e0b' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="mb-8">
          <AgentSearchBar
            onSearch={setSearchQuery}
            onFilterChange={setActiveFilters}
            activeFilters={activeFilters}
          />
        </div>

        {/* ── Search results count ── */}
        {isSearching && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        {/* ── Flat grid when searching ── */}
        {isSearching ? (
          filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  description={agent.description}
                  icon={agent.icon}
                  color={agent.color}
                  accent_color={agent.accent_color || agent.color}
                  category={agent.category}
                  tags={agent.tags as any}
                  popularity={agent.popularity}
                  workflowStep={agent.workflowStep}
                  locked={agent.locked}
                  lockedReason={agent.lockedReason}
                  isTrialAgent={agent.isTrialAgent}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                No agents match that search
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Try different keywords or clear the filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilters([]);
                }}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-black font-semibold rounded-xl transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          )
        ) : (
          /* ── Category sections ── */
          <div className="space-y-10">
            {orderedCategories.map((catKey) => {
              const agents = agentsByCategory[catKey] || [];
              const catMeta = CATEGORY_LABELS[catKey];
              const CatIcon = catMeta?.icon || BookOpen;

              return (
                <section key={catKey}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <CatIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {catMeta?.label || catKey}
                      </h2>
                      {catMeta?.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {catMeta.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto h-px bg-gray-200 dark:bg-gray-700 flex-1" />
                    <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0">
                      {agents.length} agent{agents.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Agent cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        id={agent.id}
                        name={agent.name}
                        description={agent.description}
                        icon={agent.icon}
                        color={agent.color}
                        accent_color={agent.accent_color || agent.color}
                        category={agent.category}
                        tags={agent.tags as any}
                        popularity={agent.popularity}
                        workflowStep={agent.workflowStep}
                        locked={agent.locked}
                        lockedReason={agent.lockedReason}
                        isTrialAgent={agent.isTrialAgent}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
