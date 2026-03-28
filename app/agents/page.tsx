'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles, TrendingUp, Search, Clock, Zap } from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import AgentSearchBar from '@/components/AgentSearchBar';

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  accent_color?: string;
  tags: string[];
  popularity: number;
  releaseDate: string;
  isEnabled: boolean;
  workflowStep?: number;
  locked?: boolean;
  lockedReason?: string | null;
  isTrialAgent?: boolean;
}

export default function AgentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);

  // Fetch agents from API (include auth token for trial-aware response)
  useEffect(() => {
    async function fetchAgents() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
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

  // Filter agents based on search and filters
  const filteredAgents = useMemo(() => {
    let filtered = allAgents;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (agent) =>
          agent.name.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query) ||
          agent.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter((agent) =>
        activeFilters.some(filter => agent.tags.includes(filter as any))
      );
    }

    return filtered;
  }, [allAgents, searchQuery, activeFilters]);

  // Get featured agent (most popular workflow agent)
  const featuredAgent = useMemo(() => {
    const workflowAgents = allAgents.filter(a => a.tags.includes('workflow'));
    return workflowAgents.sort((a, b) => b.popularity - a.popularity)[0] || allAgents[0];
  }, [allAgents]);

  // Determine if an agent is "new" (released within last 60 days)
  const isNewAgent = (releaseDate: string) => {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 60;
  };

  // Sort agents: workflow first (by step), then by popularity
  const sortedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      // Workflow agents first, sorted by step
      if (a.workflowStep && b.workflowStep) {
        return a.workflowStep - b.workflowStep;
      }
      if (a.workflowStep) return -1;
      if (b.workflowStep) return 1;

      // Then by popularity
      return b.popularity - a.popularity;
    });
  }, [filteredAgents]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                MindsetOS Agents
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Choose the perfect agent to help you build and grow your mindset coaching business
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trial Banner */}
        {membershipTier === 'trial' && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Free Trial — All Agents Unlocked
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  You have full access to all agents for 7 days. Upgrade to remove message limits.
                </p>
              </div>
            </div>
            <a
              href="https://www.mindset.show"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#ffc82c] hover:bg-[#f8c824] text-black font-semibold rounded-lg transition-colors text-sm flex items-center gap-1.5 flex-shrink-0"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </a>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <AgentSearchBar
            onSearch={setSearchQuery}
            onFilterChange={setActiveFilters}
            activeFilters={activeFilters}
          />
        </div>

        {/* Featured Agent */}
        {!searchQuery && activeFilters.length === 0 && featuredAgent && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#ffc82c]" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Featured Agent
              </h2>
            </div>

            <div className="relative bg-gradient-to-br from-[#ffc82c]/10 to-[#ffc82c]/5 rounded-3xl p-8 border-2 border-[#ffc82c] shadow-xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Info */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-6xl">{featuredAgent.icon}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {featuredAgent.name}
                      </h3>
                      {featuredAgent.tags.includes('popular') && (
                        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                          <TrendingUp className="w-4 h-4" />
                          Most Popular
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                    {featuredAgent.description}
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        // Navigate to dashboard with featured agent selected
                        router.push(`/dashboard`);
                      }}
                      className="px-8 py-4 bg-[#ffc82c] hover:bg-[#f8c824] text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 text-lg"
                    >
                      Start with {featuredAgent.name}
                      <ArrowRight className="w-5 h-5" />
                    </button>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Used by {featuredAgent.popularity.toLocaleString()} experts
                    </div>
                  </div>
                </div>

                {/* Right: Visual */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative w-64 h-64 bg-gradient-to-br from-[#ffc82c] to-[#f8c824] rounded-full flex items-center justify-center text-9xl shadow-2xl">
                    {featuredAgent.icon}
                    <div className="absolute inset-0 bg-white dark:bg-gray-900 opacity-0 hover:opacity-10 rounded-full transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 bg-[#ffc82c]/20 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-32 h-32 bg-[#ffc82c]/10 rounded-full blur-3xl" />
            </div>
          </div>
        )}

        {/* Results Count */}
        {(searchQuery || activeFilters.length > 0) && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Agents Grid */}
        {sortedAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                id={agent.id}
                name={agent.name}
                description={agent.description}
                icon={agent.icon}
                color={agent.color}
                accent_color={agent.accent_color || agent.color}
                tags={agent.tags as ('popular' | 'new' | 'workflow' | 'advanced' | 'quick-win' | 'content' | 'lead-gen' | 'trial')[]}
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
            <div className="mb-4 flex justify-center">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No agents found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilters([]);
              }}
              className="px-6 py-3 bg-[#ffc82c] hover:bg-[#f8c824] text-black font-semibold rounded-xl transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Workflow Guide */}
        {!searchQuery && activeFilters.length === 0 && (
          <div className="mt-16 bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              📚 MindsetOS Workflow Guide
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Follow the recommended sequence to systematically build your mindset coaching business:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {allAgents
                .filter(a => a.workflowStep)
                .sort((a, b) => (a.workflowStep || 0) - (b.workflowStep || 0))
                .map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => router.push('/dashboard')}
                  >
                    <div className="w-8 h-8 bg-[#ffc82c] text-black rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {agent.workflowStep}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {agent.name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {agent.description}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
