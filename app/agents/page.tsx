'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Search, Clock, Zap, Star, Brain, Target,
  Compass, RefreshCcw, Calendar, Radio, Rocket, BookOpen,
  ChevronLeft,
} from 'lucide-react';
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

const CATEGORY_ORDER = [
  'assessment',
  'coaching',
  'self-awareness',
  'strategy',
  'accountability',
  'content',
  'admin',
];

const CATEGORY_META: Record<string, { label: string; description: string; Icon: React.ElementType }> = {
  assessment:      { label: 'Assessment',     description: 'Measure and map where you are right now.',             Icon: Brain },
  coaching:        { label: 'Coaching',        description: 'Build your mindset architecture with guided support.',  Icon: Target },
  'self-awareness':{ label: 'Self-Awareness',  description: 'Surface the beliefs and stories running the show.',   Icon: Compass },
  strategy:        { label: 'Strategy',        description: 'Make better decisions under pressure.',                Icon: RefreshCcw },
  accountability:  { label: 'Accountability',  description: 'Stay consistent when motivation fades.',              Icon: Calendar },
  content:         { label: 'Content',         description: 'Find the right conversations for your journey.',      Icon: Radio },
  admin:           { label: 'Admin',           description: 'Behind-the-scenes tools for platform management.',    Icon: Rocket },
};

export default function AgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery]     = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated]     = useState(false);
  const [allAgents, setAllAgents]         = useState<Agent[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await res.json();
        setAllAgents(data.agents || []);
        setMembershipTier(data.membershipTier || null);
      } catch {
        setAllAgents([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAgents();
    setHasHydrated(true);
  }, []);

  const freeAgent = useMemo(() => allAgents.find((a) => a.id === 'mindset-score'), [allAgents]);

  const filteredAgents = useMemo(() => {
    let list = allAgents.filter((a) => a.id !== 'mindset-score');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (activeFilters.length > 0) {
      list = list.filter((a) => {
        const cat = (a.category || '').toLowerCase().replace(/\s+/g, '-');
        return activeFilters.some((f) => f === cat || a.tags.includes(f as any));
      });
    }
    return list;
  }, [allAgents, searchQuery, activeFilters]);

  const agentsByCategory = useMemo(() => {
    const grouped: Record<string, Agent[]> = {};
    filteredAgents.forEach((a) => {
      const cat = (a.category || 'general').toLowerCase().replace(/\s+/g, '-');
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    });
    return grouped;
  }, [filteredAgents]);

  const orderedCategories = useMemo(() => {
    const present = new Set(Object.keys(agentsByCategory));
    const ordered = CATEGORY_ORDER.filter((c) => present.has(c));
    Object.keys(agentsByCategory).forEach((c) => { if (!ordered.includes(c)) ordered.push(c); });
    return ordered;
  }, [agentsByCategory]);

  const isSearching = searchQuery.trim() !== '' || activeFilters.length > 0;

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: 'rgba(79,110,247,0.4)', borderTopColor: '#4f6ef7' }} />
          <p className="text-sm" style={{ color: '#5a5a72' }}>Loading agents…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>

      {/* ── Ambient atmosphere ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-20 left-0 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,91,246,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* ── Page header ── */}
      <div className="relative z-10 sticky top-0"
        style={{
          background: 'rgba(9,9,15,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-sm transition-colors rounded-lg px-2 py-1.5 hover:bg-white/[0.04]"
              style={{ color: '#9090a8' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Dashboard
            </button>
            <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#ededf5' }}>Agent Library</h1>
              <p className="text-xs" style={{ color: '#5a5a72' }}>Each agent handles a specific layer of your inner work</p>
            </div>
          </div>
          {allAgents.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color: '#9090a8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {allAgents.length} agents
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">

        {/* ── Trial banner ── */}
        {membershipTier === 'trial' && (
          <div className="mb-7 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl"
            style={{
              background: 'rgba(252,200,36,0.06)',
              border: '1px solid rgba(252,200,36,0.2)',
            }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(252,200,36,0.15)', border: '1px solid rgba(252,200,36,0.25)' }}>
                <Clock className="w-4 h-4" style={{ color: '#fcc824' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#ededf5' }}>
                  Free Trial — Full Access for 7 Days
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#9090a8' }}>
                  Upgrade any time to remove message limits.
                </p>
              </div>
            </div>
            <a
              href="/checkout"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-black rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
            >
              <Zap className="w-3.5 h-3.5" />
              Upgrade Now
            </a>
          </div>
        )}

        {/* ── Hero: Mindset Score ── */}
        {!isSearching && freeAgent && (
          <div className="mb-10 relative overflow-hidden rounded-2xl p-8"
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: '1px solid rgba(252,200,36,0.2)',
              backdropFilter: 'blur(14px)',
            }}>
            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 rounded-full -translate-y-1/2 translate-x-1/4"
              style={{ background: 'radial-gradient(circle, rgba(252,200,36,0.07) 0%, transparent 70%)' }} />

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              {/* Left: text */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-5"
                  style={{
                    color: '#fcc824',
                    background: 'rgba(252,200,36,0.1)',
                    border: '1px solid rgba(252,200,36,0.3)',
                  }}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Start Here — It's Free
                </div>

                <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: '#ededf5' }}>
                  {freeAgent.name}
                </h2>

                <p className="text-base leading-relaxed mb-6 max-w-md" style={{ color: '#9090a8' }}>
                  {freeAgent.description}
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 px-6 py-3 font-bold text-black text-sm rounded-xl transition-all hover:shadow-[0_0_24px_rgba(252,200,36,0.3)] hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
                  >
                    Take the 5-Question Assessment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {freeAgent.popularity > 0 && (
                    <span className="text-xs hidden sm:block" style={{ color: '#5a5a72' }}>
                      {freeAgent.popularity.toLocaleString()} sessions
                    </span>
                  )}
                </div>
              </div>

              {/* Right: icon */}
              <div className="hidden md:flex items-center justify-center">
                <div className="w-36 h-36 rounded-3xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${freeAgent.accent_color || '#f59e0b'}1a, ${freeAgent.accent_color || '#f59e0b'}08)`,
                    border: `1px solid ${freeAgent.accent_color || '#f59e0b'}2a`,
                    boxShadow: `0 0 60px ${freeAgent.accent_color || '#f59e0b'}10`,
                  }}>
                  <Brain className="w-16 h-16" style={{ color: freeAgent.accent_color || '#f59e0b' }} />
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
          <p className="text-sm mb-6" style={{ color: '#9090a8' }}>
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
            <div className="text-center py-20">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Search className="w-5 h-5" style={{ color: '#5a5a72' }} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: '#ededf5' }}>
                No agents match that search
              </h3>
              <p className="text-sm mb-6" style={{ color: '#9090a8' }}>
                Try different keywords or clear the filters.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilters([]); }}
                className="px-5 py-2.5 text-black font-semibold rounded-xl text-sm transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg,#fcc824 0%,#f0b800 100%)' }}
              >
                Clear Filters
              </button>
            </div>
          )
        ) : (
          /* ── Category sections ── */
          <div className="space-y-12">
            {orderedCategories.map((catKey) => {
              const agents = agentsByCategory[catKey] || [];
              const meta = CATEGORY_META[catKey];
              const CatIcon = meta?.Icon || BookOpen;

              return (
                <section key={catKey}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.2)' }}>
                      <CatIcon className="w-4 h-4" style={{ color: '#7b92ff' }} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold" style={{ color: '#ededf5' }}>
                        {meta?.label || catKey}
                      </h2>
                      {meta?.description && (
                        <p className="text-xs" style={{ color: '#5a5a72' }}>
                          {meta.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <span className="text-xs flex-shrink-0" style={{ color: '#5a5a72' }}>
                      {agents.length} agent{agents.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Cards */}
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
