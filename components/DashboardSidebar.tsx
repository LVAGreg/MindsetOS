'use client';

/**
 * DashboardSidebar — MindsetOS coaching studio navigation.
 *
 * Design principles:
 * - Dark studio aesthetic: deep navy/charcoal base, not flat black
 * - Amber (#fcc824) as the single accent — used surgically, not flooded
 * - Five clear nav sections with consistent 44px+ touch targets
 * - Mindset Score CTA appears prominently for users who haven't taken it
 * - Premium badge for power_user/paid accounts
 * - Avatar + name at bottom with role indicator
 * - Mobile: full-screen slide-in with backdrop, smooth 300ms transition
 * - Active state: amber left-border indicator + very subtle amber tint
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  Users,
  BookOpen,
  MessageSquare,
  Settings,
  LogOut,
  PanelLeftClose,
  Plus,
  Search,
  Star,
  Brain,
  Zap,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Mail,
  Ticket,
  MessageCircle,
  Building2,
  Sparkles,
  Sun,
  Moon,
  PanelRightOpen,
  Shield,
  Lock,
  TrendingUp,
  GraduationCap,
  CheckCircle2,
  Key,
  FileText,
  ClipboardList,
  Kanban,
} from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { useAppStore } from '@/lib/store';
import { apiClient } from '@/lib/api-client';

/* ─── Types ─────────────────────────────────────────────── */
interface DashboardSidebarProps {
  /** Currently active navigation section */
  activeSection: 'home' | 'agents' | 'playbook' | 'conversations' | 'profile' | null;
  onSectionChange: (section: 'home' | 'agents' | 'playbook' | 'conversations' | 'profile') => void;
  onNewChat: () => void;
  onSearch: () => void;
  onLogout: () => void;
  /** Sidebar children — conversation history, playbook list, etc. */
  children?: React.ReactNode;
  /** Whether the user has completed the Mindset Score */
  hasMindsetScore?: boolean;
  /** Unread feedback count */
  unreadFeedbackCount?: number;
  onFeedbackClick?: () => void;
  viewAsUser?: { id?: string; name?: string; email?: string; role?: string; membershipTier?: string } | null;
  /** Called when user clicks the Accountability Partner nav item */
  onAccountabilityPartnerClick?: () => void;
}

/* ─── Streak hook ────────────────────────────────────────── */
/** Matches exactly what GET /api/streak and POST /api/streak/checkin return */
interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

const LS_STREAK_KEY = 'mindset_streak';

function useAccountabilityStreak(): [number, StreakData | null, () => void] {
  const [streak, setStreak] = useState<number>(0);
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStreak() {
      try {
        const innerClient = (apiClient as unknown as { client: { get: (url: string) => Promise<{ data: StreakData }> } }).client;
        const res = await innerClient.get('/api/streak');
        if (!cancelled && res?.data?.current_streak !== undefined) {
          const val = res.data.current_streak;
          setStreak(val);
          setStreakData(res.data);
          localStorage.setItem(LS_STREAK_KEY, String(val));
          return;
        }
      } catch {
        // endpoint not available — fall back to localStorage
      }
      if (!cancelled) {
        const stored = localStorage.getItem(LS_STREAK_KEY);
        setStreak(stored ? parseInt(stored, 10) || 0 : 0);
      }
    }

    async function doCheckin() {
      try {
        const innerClient = (apiClient as unknown as { client: { post: (url: string) => Promise<{ data: StreakData }> } }).client;
        const res = await innerClient.post('/api/streak/checkin');
        if (!cancelled && res?.data?.current_streak !== undefined) {
          const val = res.data.current_streak;
          setStreak(val);
          setStreakData(res.data);
          localStorage.setItem(LS_STREAK_KEY, String(val));
        }
      } catch {
        // checkin failure is non-critical — streak display remains from fetch
      }
    }

    // Fetch current state first, then record today's activity
    fetchStreak().then(() => { if (!cancelled) doCheckin(); });
    return () => { cancelled = true; };
  }, []);

  const incrementStreak = () => {
    setStreak(prev => {
      const next = prev + 1;
      localStorage.setItem(LS_STREAK_KEY, String(next));
      return next;
    });
  };

  return [streak, streakData, incrementStreak];
}

/* ─── Token usage meter ──────────────────────────────────── */
interface TokenUsageData {
  quota: number;
  used: number;
  pct_used: number;
  resets_at: string;
  byok_enabled: boolean;
}

function TokenUsageMeter() {
  const router = useRouter();
  const [data, setData] = useState<TokenUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsage() {
      try {
        const innerClient = (apiClient as unknown as { client: { get: (url: string) => Promise<{ data: TokenUsageData }> } }).client;
        const res = await innerClient.get('/api/tokens/usage');
        if (!cancelled && res?.data) {
          setData(res.data);
        }
      } catch {
        // non-critical — hide meter on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsage();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) return null;

  // BYOK active: show green pill
  if (data.byok_enabled) {
    return (
      <div className="mx-3 mb-2">
        <button
          onClick={() => router.push('/profile')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
          style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}
          aria-label="BYOK active — go to profile"
        >
          <Key className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4f6ef7' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#4f6ef7' }}>BYOK Active</span>
        </button>
      </div>
    );
  }

  const pct = Math.min(100, data.pct_used ?? Math.round((data.used / Math.max(data.quota, 1)) * 100));
  const barColor = pct >= 90 ? '#e05252' : pct >= 70 ? '#fcc824' : 'rgba(144,144,168,0.5)';
  const labelColor = pct >= 90 ? '#e05252' : pct >= 70 ? '#fcc824' : '#5a5a72';

  // Format reset date
  let resetLabel = '';
  if (data.resets_at) {
    try {
      const d = new Date(data.resets_at);
      resetLabel = `Resets ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } catch {
      resetLabel = '';
    }
  }

  return (
    <div className="mx-3 mb-2">
      <button
        onClick={() => router.push('/profile')}
        className="w-full text-left px-3 py-2 rounded-xl transition-colors"
        style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid rgba(30,30,48,0.9)' }}
        aria-label="Token usage — go to profile"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#5a5a72' }}>Tokens</span>
          <span className="text-[10px] font-bold" style={{ color: labelColor }}>{pct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(237,237,245,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        {resetLabel && (
          <p className="mt-1.5 text-[10px]" style={{ color: '#5a5a72' }}>{resetLabel}</p>
        )}
      </button>
    </div>
  );
}

/* ─── Role badge ─────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const isPremium = role === 'power_user' || role === 'agency';
  const isAdmin = role === 'admin';

  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase" style={{ background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.22)', color: '#7c5bf6' }}>
        <Shield className="w-2.5 h-2.5" />
        Admin
      </span>
    );
  }

  if (isPremium) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#fcc824]/12 border border-[#fcc824]/20 text-[10px] font-bold text-[#fcc824] tracking-wide uppercase">
        <Star className="w-2.5 h-2.5" />
        {role === 'agency' ? 'Agency' : 'Premium'}
      </span>
    );
  }

  return null;
}

/* ─── Nav item ───────────────────────────────────────────── */
function NavItem({
  icon,
  label,
  isActive,
  onClick,
  badge,
  locked,
  className = '',
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  badge?: number | string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      onMouseEnter={e => {
        if (!isActive && !locked) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(237,237,245,0.05)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive && !locked) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
      className={`
        w-full flex items-center gap-3 px-3 py-3 rounded-xl
        transition-all duration-150 text-left group relative
        min-h-[44px]
        ${isActive
          ? 'bg-[#fcc824]/[0.07] text-[#fcc824] border border-[#fcc824]/[0.14] border-l-[3px] border-l-[#fcc824]'
          : locked
            ? 'opacity-40 cursor-not-allowed border border-transparent'
            : 'border border-transparent'
        }
        ${className}
      `}
    >
      {/* Active left-border indicator (additional inset glow) */}
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#fcc824] shadow-[0_0_6px_#fcc82466]" />
      )}

      <span
        className="flex-shrink-0 transition-colors duration-200"
        style={{ color: isActive ? '#fcc824' : '#5a5a72' }}
      >
        {icon}
      </span>

      <span
        className="text-sm font-medium flex-1 truncate"
        style={{ color: isActive ? '#fcc824' : '#9090a8' }}
      >
        {label}
      </span>

      {locked && <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#5a5a72' }} />}

      {badge !== undefined && badge !== 0 && (
        <span
          className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
          style={isActive
            ? { background: '#fcc824', color: '#000' }
            : { background: 'rgba(237,237,245,0.08)', color: '#9090a8' }
          }
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Section label ──────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#5a5a72' }}>
        {children}
      </p>
    </div>
  );
}

/* ─── Stat pill ──────────────────────────────────────────── */
function StatPill({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs font-bold text-[#ededf5]">{icon} {value}</span>
      <span className="text-[10px] text-[#9090a8]">{label}</span>
    </div>
  );
}

/* ─── Stats strip ────────────────────────────────────────── */
interface UserStats {
  streak: number;
  sessionsThisWeek: number;
  score: number | null;
}

function computeStatsFromConversations(
  conversations: Array<{ createdAt: Date | string; updatedAt: Date | string }>
): UserStats {
  const now = new Date();

  // Sessions this week — conversations updated in the last 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sessionsThisWeek = conversations.filter((c) => {
    const d = new Date(c.updatedAt);
    return d >= sevenDaysAgo;
  }).length;

  // Streak — consecutive days ending today with at least 1 conversation
  const daySet = new Set<string>();
  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    daySet.add(key);
  }

  let streak = 0;
  const cursor = new Date(now);
  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (daySet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak, sessionsThisWeek, score: null };
}

function StatsStrip({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchStats() {
      try {
        // Try the dedicated stats endpoint first
        let resolved = false;
        try {
          // Access the underlying axios client via a typed cast
          const innerClient = (apiClient as unknown as { client: { get: (url: string) => Promise<{ data: Record<string, unknown> }> } }).client;
          const res = await innerClient.get('/api/users/me/stats');
          if (res?.data && !cancelled) {
            setStats({
              streak: (res.data.streak as number) ?? 0,
              sessionsThisWeek: (res.data.sessionsThisWeek as number) ?? 0,
              score: (res.data.score as number | null) ?? null,
            });
            resolved = true;
          }
        } catch {
          // endpoint doesn't exist yet — fall through to conversations
        }

        if (!resolved && !cancelled) {
          const conversations = await apiClient.getUserConversations();
          if (!cancelled) {
            setStats(computeStatsFromConversations(conversations));
          }
        }
      } catch {
        // silently fail — stats are non-critical
        if (!cancelled) setStats({ streak: 0, sessionsThisWeek: 0, score: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-[#12121f] border border-[#1e1e30]">
        <div className="flex items-center justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-3 w-12 rounded animate-pulse" style={{ background: 'rgba(237,237,245,0.07)' }} />
              <div className="h-2 w-8 rounded animate-pulse" style={{ background: 'rgba(237,237,245,0.04)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-[#12121f] border border-[#1e1e30]">
      <div className="flex items-center justify-between">
        <StatPill icon="🔥" value={stats.streak} label="day streak" />
        <StatPill icon="💬" value={stats.sessionsThisWeek} label="this week" />
        {stats.score !== null && <StatPill icon="📊" value={stats.score} label="score" />}
      </div>
    </div>
  );
}

/* ─── Streak widget ──────────────────────────────────────── */
interface MilestoneDef {
  id: string;
  icon: string;
  label: string;
  earned: (data: StreakData, membershipTier?: string) => boolean;
}

const STREAK_MILESTONES: MilestoneDef[] = [
  {
    id: 'first_week',
    icon: '🏅',
    label: 'First Week',
    earned: (data) => data.longest_streak >= 7,
  },
  {
    id: 'score_taken',
    icon: '🎯',
    label: 'Score Taken',
    // If they're logged in and using the app, the mindset score was taken
    earned: () => true,
  },
  {
    id: 'reset_done',
    icon: '⚡',
    label: 'Reset Done',
    earned: (_data, membershipTier) => membershipTier !== 'free' && membershipTier !== undefined,
  },
];

function StreakWidget({
  streakData,
  membershipTier,
}: {
  streakData: StreakData | null;
  membershipTier?: string;
}) {
  if (!streakData) return null;

  const currentStreak = streakData.current_streak;
  const longestStreak = streakData.longest_streak;
  const isEmpty = currentStreak === 0;

  return (
    <div
      className="mx-3 mb-2"
      style={{ borderTop: '1px solid #1e1e30', paddingTop: 10 }}
      aria-label={`Streak and achievements section. Current streak: ${currentStreak} days.`}
    >
      {/* Streak counter row */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span role="img" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>🔥</span>
        {isEmpty ? (
          <span
            className="text-[11px]"
            style={{ color: '#9090a8', fontStyle: 'italic' }}
          >
            Start your streak today
          </span>
        ) : (
          <>
            <span
              style={{ color: '#fcc824', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1 }}
              aria-label={`${currentStreak} day streak`}
            >
              {currentStreak}
            </span>
            <span style={{ color: '#9090a8', fontSize: '0.75rem' }}>
              {currentStreak === 1 ? 'day streak' : 'day streak'}
            </span>
            {longestStreak > currentStreak && (
              <span
                style={{ color: '#5a5a72', fontSize: '0.65rem', marginLeft: 'auto' }}
                aria-label={`Longest streak: ${longestStreak} days`}
              >
                best {longestStreak}
              </span>
            )}
          </>
        )}
      </div>

      {/* Achievement badges */}
      <div
        className="flex gap-1.5"
        style={{ flexWrap: 'wrap' }}
        role="list"
        aria-label="Achievement badges"
      >
        {STREAK_MILESTONES.map((milestone) => {
          const isEarned = milestone.earned(streakData, membershipTier);
          return (
            <div
              key={milestone.id}
              role="listitem"
              title={`${milestone.label}${isEarned ? ' (earned)' : ' (not yet earned)'}`}
              aria-label={`${milestone.label} badge — ${isEarned ? 'earned' : 'not yet earned'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: '0.7rem',
                minHeight: 44,
                minWidth: 0,
                flexShrink: 0,
                transition: 'opacity 0.2s',
                ...(isEarned
                  ? {
                      background: 'rgba(79,110,247,0.1)',
                      border: '1px solid rgba(79,110,247,0.3)',
                      color: '#ededf5',
                      opacity: 1,
                    }
                  : {
                      background: 'rgba(18,18,31,0.4)',
                      border: '1px solid #1e1e30',
                      color: '#5a5a72',
                      opacity: 0.4,
                    }),
              }}
            >
              <span role="img" aria-hidden="true">{milestone.icon}</span>
              <span style={{ whiteSpace: 'nowrap', fontWeight: isEarned ? 600 : 400 }}>
                {milestone.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Pattern Insight Card ───────────────────────────────── */
interface PatternInsights {
  pattern: 'reactor' | 'avoider' | 'optimizer' | 'none';
  label: string | null;
  avg_score: number | null;
  trend: number | null;
  trend_direction: 'improving' | 'declining' | 'steady' | 'none';
  entry_count: number;
}

function PatternInsightCard() {
  const [insights, setInsights] = useState<PatternInsights | null>(null);

  useEffect(() => {
    apiClient.get('/api/mindset-score/insights')
      .then((res: PatternInsights) => {
        if (res && res.entry_count > 0) setInsights(res);
      })
      .catch(() => {});
  }, []);

  if (!insights) return null;

  const COLOR_MAP: Record<string, string> = {
    reactor: '#fcc824',
    avoider: '#4f6ef7',
    optimizer: '#7c5bf6',
  };
  const color = COLOR_MAP[insights.pattern] || '#9090a8';

  const trendLabel =
    insights.trend_direction === 'improving' ? '↑ improving'
    : insights.trend_direction === 'declining' ? '↓ needs work'
    : '→ steady';

  return (
    <div
      className="mx-2 mb-2 px-3 py-2.5 rounded-xl"
      style={{ background: 'rgba(18,18,31,0.6)', border: `1px solid ${color}30` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5a5a72' }}>
          Your pattern
        </span>
        <span className="text-[10px] font-medium" style={{ color: color }}>
          {trendLabel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[13px] font-bold" style={{ color: '#ededf5' }}>
          {insights.label}
        </span>
        <span className="text-[11px] ml-auto font-mono" style={{ color: '#9090a8' }}>
          avg {insights.avg_score}
        </span>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function DashboardSidebar({
  activeSection,
  onSectionChange,
  onNewChat,
  onSearch,
  onLogout,
  children,
  hasMindsetScore = false,
  unreadFeedbackCount = 0,
  onFeedbackClick,
  viewAsUser,
  onAccountabilityPartnerClick,
}: DashboardSidebarProps) {
  const router = useRouter();
  const {
    user,
    isSidebarOpen,
    toggleSidebar,
    theme,
    setTheme,
    memoryEnabled,
    setMemoryEnabled,
    widgetFormattingEnabled,
    setWidgetFormattingEnabled,
    viewAsUser: viewAsUserStore,
  } = useAppStore();

  const canvasEnabled = useAppStore(s => s.canvasEnabled);
  const effectiveUser = viewAsUser || user;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [streak, streakData, incrementStreak] = useAccountabilityStreak();

  const isAdmin = effectiveUser?.role === 'admin';
  const isPowerUser = effectiveUser?.role === 'power_user';
  const isAgency = effectiveUser?.role === 'agency';
  const isPremium = isPowerUser || isAgency || isAdmin;

  /* ── Expanded sidebar ─────────────────────────────────── */
  const ExpandedSidebar = (
    <div className="w-[272px] flex flex-col h-full min-h-0
      sidebar-studio
      relative overflow-hidden
    " style={{ borderRight: '1px solid rgba(237,237,245,0.05)', color: '#ededf5' }}>
      {/* Ambient background orbs — depth without noise */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#fcc824]/[0.025] blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(79,110,247,0.015)' }} />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(237,237,245,0.05)' }}>
        <MindsetOSLogo size="md" variant="light" />

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg transition-colors"
          style={{ color: '#5a5a72' }}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      {/* ── New Chat ───────────────────────────────────────── */}
      <div className="relative px-3 pt-3 pb-1">
        <button
          onClick={onNewChat}
          className="
            w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
            border border-[#fcc824]/20 bg-[#fcc824]/[0.04]
            hover:border-[#fcc824]/40 hover:bg-[#fcc824]/[0.08]
            transition-all duration-200 group min-h-[44px]
          "
        >
          <div className="w-7 h-7 rounded-lg bg-[#fcc824]/10 flex items-center justify-center group-hover:bg-[#fcc824]/18 transition-colors">
            <Plus className="w-4 h-4 text-[#fcc824]" />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#ededf5' }}>New Chat</span>
        </button>
      </div>

      {/* ── Stats strip ───────────────────────────────────── */}
      <StatsStrip userId={effectiveUser?.id} />

      {/* ── Nav content — scrollable ───────────────────────── */}
      <div className="relative flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-2">

        {/* ── Mindset Score CTA ── appears only when not taken ── */}
        {!hasMindsetScore && (
          <div className="mx-3 mt-3 mb-1">
            <button
              onClick={() => router.push('/dashboard?agent=mindset-score')}
              className="
                w-full rounded-xl overflow-hidden
                border border-[#fcc824]/20 bg-gradient-to-br from-[#fcc824]/[0.08] to-[#fcc824]/[0.02]
                hover:border-[#fcc824]/35 hover:from-[#fcc824]/[0.12] hover:to-[#fcc824]/[0.05]
                transition-all duration-300 group text-left p-3
              "
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#fcc824]/15 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#fcc824]/22 transition-colors">
                  <TrendingUp className="w-4 h-4 text-[#fcc824]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#fcc824] leading-tight">Take Your Mindset Score</p>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#5a5a72' }}>5 questions · free · takes 2 min</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#fcc824]/50 flex-shrink-0 mt-1.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* ── Main navigation ───────────────────────────────── */}
        <SectionLabel>Navigate</SectionLabel>
        <div className="px-2 space-y-0.5">
          <NavItem
            icon={<Home className="w-4.5 h-4.5" />}
            label="Home"
            isActive={activeSection === 'home'}
            onClick={() => onSectionChange('home')}
          />
          <NavItem
            icon={<Users className="w-4.5 h-4.5" />}
            label="Agents"
            isActive={activeSection === 'agents'}
            onClick={() => onSectionChange('agents')}
          />
          <NavItem
            icon={<BookOpen className="w-4.5 h-4.5" />}
            label="Playbook"
            isActive={activeSection === 'playbook'}
            onClick={() => onSectionChange('playbook')}
          />
          <NavItem
            icon={<MessageSquare className="w-4.5 h-4.5" />}
            label="Conversations"
            isActive={activeSection === 'conversations'}
            onClick={() => onSectionChange('conversations')}
          />
          <NavItem
            icon={<CheckCircle2 className="w-4.5 h-4.5" />}
            label="Accountability"
            badge={streak > 0 ? `🔥 ${streak}` : undefined}
            onClick={() => {
              incrementStreak();
              if (onAccountabilityPartnerClick) {
                onAccountabilityPartnerClick();
              } else {
                router.push('/dashboard?agent=ACCOUNTABILITY_PARTNER');
              }
            }}
          />
          <NavItem
            icon={<FileText className="w-4.5 h-4.5" />}
            label="Notes"
            onClick={() => router.push('/dashboard/notes')}
          />
          <NavItem
            icon={<ClipboardList className="w-4.5 h-4.5" />}
            label="Structured Assessment"
            onClick={() => router.push('/dashboard/quiz')}
          />
        </div>

        {/* ── Premium upgrade CTA — free/trial users only ────── */}
        {!isPremium && effectiveUser?.membershipTier !== 'paid' && (
          <>
            <SectionLabel>Upgrade</SectionLabel>
            <div className="px-2">
              <button
                onClick={() => router.push('/join')}
                className="
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl
                  bg-gradient-to-r from-[#fcc824]/[0.08] to-transparent
                  border border-[#fcc824]/15
                  hover:from-[#fcc824]/[0.14] hover:border-[#fcc824]/28
                  transition-all duration-200 group text-left min-h-[44px]
                "
              >
                <div className="w-7 h-7 rounded-lg bg-[#fcc824]/12 flex items-center justify-center group-hover:bg-[#fcc824]/20 transition-colors flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-[#fcc824]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#fcc824] leading-tight">Go Premium</p>
                  <p className="text-[11px] leading-tight mt-0.5" style={{ color: '#5a5a72' }}>Unlock all 10 agents</p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Progress tools (all paid users) ──────────────── */}
        {isPremium && (
          <>
            <SectionLabel>My Progress</SectionLabel>
            <div className="px-2 space-y-0.5">
              <NavItem
                icon={<TrendingUp className="w-4.5 h-4.5" />}
                label="Weekly Wins"
                onClick={() => router.push('/dashboard/claps')}
              />
              <NavItem
                icon={<Kanban className="w-4.5 h-4.5" />}
                label="Pipeline"
                onClick={() => router.push('/dashboard/pipeline')}
              />
              <NavItem
                icon={<GraduationCap className="w-4.5 h-4.5" />}
                label="Referrals"
                onClick={() => router.push('/dashboard/referrals')}
              />
            </div>
          </>
        )}

        {/* ── Agency / practice tools ───────────────────────── */}
        {(isAgency || isAdmin) && (
          <>
            <SectionLabel>Practice Tools</SectionLabel>
            <div className="px-2 space-y-0.5">
              <NavItem
                icon={<Building2 className="w-4.5 h-4.5" />}
                label="Clients"
                onClick={() => router.push('/dashboard/clients')}
              />
              <NavItem
                icon={<Users className="w-4.5 h-4.5" />}
                label="Team"
                onClick={() => router.push('/dashboard/team')}
              />
              <NavItem
                icon={<Sparkles className="w-4.5 h-4.5" />}
                label="My Agents"
                onClick={() => router.push('/dashboard/my-agents')}
              />
            </div>
          </>
        )}

        {/* ── Admin section ─────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionLabel>Administration</SectionLabel>
            <div className="px-2 space-y-0.5">
              <NavItem
                icon={<BarChart3 className="w-4.5 h-4.5" />}
                label="Admin Dashboard"
                onClick={() => router.push('/admin')}
              />
              <NavItem
                icon={<Users className="w-4.5 h-4.5" />}
                label="Users"
                onClick={() => router.push('/admin/users')}
              />
              <NavItem
                icon={<Ticket className="w-4.5 h-4.5" />}
                label="Invite Codes"
                onClick={() => router.push('/admin/invite-codes')}
              />
              <NavItem
                icon={<Mail className="w-4.5 h-4.5" />}
                label="Email Templates"
                onClick={() => router.push('/admin/emails')}
              />
              <NavItem
                icon={<MessageCircle className="w-4.5 h-4.5" />}
                label="Feedback"
                onClick={() => router.push('/admin/feedback')}
                badge={unreadFeedbackCount > 0 ? (unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount) : undefined}
              />
            </div>
          </>
        )}

        {/* ── Sidebar slot — conversation history / playbook list etc ── */}
        {children && (
          <div className="mt-1">
            {children}
          </div>
        )}

      </div>

      {/* ── Token usage meter ─────────────────────────────── */}
      <TokenUsageMeter />

      {/* ── Streak + achievements ──────────────────────────── */}
      <StreakWidget
        streakData={streakData}
        membershipTier={effectiveUser?.membershipTier}
      />

      {/* ── Persistent pattern insight ─────────────────────── */}
      <PatternInsightCard />

      {/* ── Footer: user profile ──────────────────────────── */}
      <div className="relative flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(237,237,245,0.05)' }}>

        {/* User menu popup */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            <div
              className="absolute bottom-full left-0 right-0 mb-2 mx-1 z-50 rounded-2xl overflow-hidden"
              style={{ background: '#0f1520', border: '1px solid rgba(237,237,245,0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
            >
              {/* Profile header */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(237,237,245,0.05)' }}>
                {viewAsUser ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4f6ef7' }}>Viewing as</p>
                    <p className="text-sm font-semibold truncate mt-0.5" style={{ color: '#ededf5' }}>{effectiveUser?.name || effectiveUser?.email}</p>
                    <p className="text-[11px] capitalize" style={{ color: '#5a5a72' }}>{effectiveUser?.role?.replace('_', ' ')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5a5a72' }}>Signed in as</p>
                    <p className="text-sm font-semibold truncate mt-0.5" style={{ color: '#ededf5' }}>{user?.name || user?.email}</p>
                    <p className="text-[11px] capitalize" style={{ color: '#5a5a72' }}>{effectiveUser?.role?.replace('_', ' ')}</p>
                  </>
                )}
              </div>

              <div className="py-1.5">
                {/* Profile */}
                <button
                  onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors min-h-[44px]"
                  style={{ color: '#9090a8' }}
                >
                  <Settings className="w-4 h-4" style={{ color: '#5a5a72' }} />
                  <span>Profile & Settings</span>
                </button>

                {/* Search */}
                <button
                  onClick={() => { onSearch(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors min-h-[44px]"
                  style={{ color: '#9090a8' }}
                >
                  <Search className="w-4 h-4" style={{ color: '#5a5a72' }} />
                  <span>Search Conversations</span>
                </button>

                {/* Feedback */}
                {onFeedbackClick && (
                  <button
                    onClick={() => { onFeedbackClick(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors min-h-[44px]"
                    style={{ color: '#9090a8' }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: '#5a5a72' }} />
                    <span>Send Feedback</span>
                    {unreadFeedbackCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: '#c0392b', color: '#ededf5' }}>
                        {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Preferences divider */}
                <div className="mx-4 my-1" style={{ borderTop: '1px solid rgba(237,237,245,0.05)' }} />

                {/* Dark Mode */}
                <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                  <div className="flex items-center gap-2.5 text-sm" style={{ color: '#9090a8' }}>
                    {theme === 'dark'
                      ? <Moon className="w-4 h-4" style={{ color: '#5a5a72' }} />
                      : <Sun className="w-4 h-4" style={{ color: '#5a5a72' }} />
                    }
                    <span>Dark Mode</span>
                  </div>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium"
                    style={{ background: theme === 'dark' ? '#fcc824' : 'rgba(237,237,245,0.1)' }}
                    aria-label="Toggle dark mode"
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform shadow-sm ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'}`}
                      style={{ background: '#ededf5' }}
                    />
                  </button>
                </div>

                {/* Widgets toggle */}
                {user && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm" style={{ color: '#9090a8' }}>
                      <Sparkles className="w-4 h-4" style={{ color: '#5a5a72' }} />
                      <span>Widgets</span>
                    </div>
                    <button
                      onClick={() => setWidgetFormattingEnabled(!widgetFormattingEnabled)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium"
                      style={{ background: widgetFormattingEnabled ? '#7c5bf6' : 'rgba(237,237,245,0.1)' }}
                      aria-label="Toggle widgets"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform shadow-sm ${widgetFormattingEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                        style={{ background: '#ededf5' }}
                      />
                    </button>
                  </div>
                )}

                {/* Memory toggle — admin/power_user only */}
                {(isAdmin || isPowerUser) && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm" style={{ color: '#9090a8' }}>
                      <Brain className="w-4 h-4" style={{ color: '#5a5a72' }} />
                      <span>Memory Context</span>
                    </div>
                    <button
                      onClick={() => setMemoryEnabled(!memoryEnabled)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium"
                      style={{ background: memoryEnabled ? '#4f6ef7' : 'rgba(237,237,245,0.1)' }}
                      aria-label="Toggle memory context"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform shadow-sm ${memoryEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                        style={{ background: '#ededf5' }}
                      />
                    </button>
                  </div>
                )}

                {/* Playbook toggle */}
                {user && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm" style={{ color: '#9090a8' }}>
                      <PanelRightOpen className="w-4 h-4" style={{ color: '#5a5a72' }} />
                      <span>Playbook Panel</span>
                    </div>
                    <button
                      onClick={() => {
                        const store = useAppStore.getState();
                        store.setCanvasEnabled(!canvasEnabled);
                      }}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium"
                      style={{ background: canvasEnabled ? '#fcc824' : 'rgba(237,237,245,0.1)' }}
                      aria-label="Toggle playbook panel"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform shadow-sm ${canvasEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                        style={{ background: '#ededf5' }}
                      />
                    </button>
                  </div>
                )}

                {/* Upgrade — non-premium, non-agency */}
                {!isPremium && !isAdmin && (
                  <>
                    <div className="mx-4 my-1" style={{ borderTop: '1px solid rgba(237,237,245,0.05)' }} />
                    <button
                      onClick={() => { router.push('/agency'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors min-h-[44px]"
                      style={{ color: '#fcc824' }}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Upgrade to Coaching Practice</span>
                    </button>
                  </>
                )}

                {/* Sign out */}
                <div className="mx-4 my-1" style={{ borderTop: '1px solid rgba(237,237,245,0.05)' }} />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors min-h-[44px]"
                  style={{ color: '#e05252' }}
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* User profile button */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-150 group min-h-[44px]"
        >
          {/* Avatar — initials from firstName + lastName, gold ring on hover */}
          {(() => {
            const name = effectiveUser?.name || '';
            const parts = name.trim().split(/\s+/);
            const initials = parts.length >= 2
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : (name[0] || effectiveUser?.email?.[0] || 'U').toUpperCase();
            const avatarStyle: React.CSSProperties = viewAsUser
              ? { background: 'linear-gradient(135deg, #4f6ef7, #6c47d0)', color: '#ededf5' }
              : isPremium
                ? { background: 'linear-gradient(135deg, #fcc824, #d97706)', color: '#000' }
                : { background: 'linear-gradient(135deg, #3a3a52, #2a2a3e)', color: '#9090a8' };
            return (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm transition-all duration-150"
                style={avatarStyle}
              >
                {initials}
              </div>
            );
          })()}

          {/* Name + role */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: '#ededf5' }}>
                {viewAsUser
                  ? (effectiveUser?.name || effectiveUser?.email)
                  : (user?.name || user?.email)
                }
              </p>
              {effectiveUser?.role && <RoleBadge role={effectiveUser.role} />}
            </div>
            {viewAsUser && (
              <p className="text-[11px] font-medium leading-tight mt-0.5" style={{ color: '#4f6ef7' }}>viewing as</p>
            )}
          </div>

          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} style={{ color: '#5a5a72' }} />
        </button>
      </div>
    </div>
  );

  /* ── Collapsed sidebar (desktop only) ──────────────────── */
  const CollapsedSidebar = (
    <div className="hidden md:flex w-[60px] flex-col h-full sidebar-studio" style={{ borderRight: '1px solid rgba(237,237,245,0.05)' }}>
      {/* Logo / expand */}
      <div className="px-2 py-3" style={{ borderBottom: '1px solid rgba(237,237,245,0.05)' }}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl transition-colors w-full flex items-center justify-center"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <Brain className="w-5 h-5 text-[#fcc824]" strokeWidth={2.2} />
        </button>
      </div>

      {/* Icon nav */}
      <div className="flex-1 flex flex-col items-center gap-1 py-3 overflow-y-auto">
        <button
          onClick={onNewChat}
          className="p-3 hover:bg-[#fcc824]/[0.08] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="New Chat"
          aria-label="New Chat"
        >
          <Plus className="w-5 h-5 transition-colors" style={{ color: '#5a5a72' }} />
        </button>

        <button
          onClick={() => onSectionChange('agents')}
          className="p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={activeSection === 'agents' ? { background: 'rgba(252,200,36,0.08)' } : undefined}
          title="Agents"
          aria-label="Agents"
        >
          <Users className="w-5 h-5 transition-colors" style={{ color: activeSection === 'agents' ? '#fcc824' : '#5a5a72' }} />
        </button>

        <button
          onClick={() => onSectionChange('playbook')}
          className="p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={activeSection === 'playbook' ? { background: 'rgba(252,200,36,0.08)' } : undefined}
          title="Playbook"
          aria-label="Playbook"
        >
          <BookOpen className="w-5 h-5 transition-colors" style={{ color: activeSection === 'playbook' ? '#fcc824' : '#5a5a72' }} />
        </button>

        <button
          onClick={() => onSectionChange('conversations')}
          className="p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          style={activeSection === 'conversations' ? { background: 'rgba(252,200,36,0.08)' } : undefined}
          title="Conversations"
          aria-label="Conversations"
        >
          <MessageSquare className="w-5 h-5 transition-colors" style={{ color: activeSection === 'conversations' ? '#fcc824' : '#5a5a72' }} />
        </button>

        <button
          onClick={() => router.push('/dashboard/notes')}
          className="p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Notes"
          aria-label="Notes"
        >
          <FileText className="w-5 h-5 transition-colors" style={{ color: '#5a5a72' }} />
        </button>

        <button
          onClick={onSearch}
          className="p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-5 h-5 transition-colors" style={{ color: '#5a5a72' }} />
        </button>
      </div>

      {/* User avatar */}
      <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(237,237,245,0.05)' }}>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-xl transition-all duration-150 w-full flex items-center justify-center min-h-[44px]"
          title={user?.name || user?.email || 'Open sidebar'}
          aria-label="Open sidebar"
        >
          {(() => {
            const name = user?.name || '';
            const parts = name.trim().split(/\s+/);
            const initials = parts.length >= 2
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : (name[0] || user?.email?.[0] || 'U').toUpperCase();
            const collapsedAvatarStyle: React.CSSProperties = isPremium
              ? { background: 'linear-gradient(135deg, #fcc824, #d97706)', color: '#000' }
              : { background: 'linear-gradient(135deg, #3a3a52, #2a2a3e)', color: '#9090a8' };
            return (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm transition-all duration-150"
                style={collapsedAvatarStyle}
              >
                {initials}
              </div>
            );
          })()}
        </button>
      </div>
    </div>
  );

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <>
      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-30 md:hidden"
          style={{ background: 'rgba(9,9,15,0.75)' }}
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Expanded: show on desktop always if open, on mobile as slide-in overlay */}
      {isSidebarOpen ? (
        <div
          className="fixed inset-y-0 left-0 z-40 md:relative md:z-auto sidebar-slide-in"
        >
          {ExpandedSidebar}
        </div>
      ) : (
        /* Collapsed: desktop only */
        CollapsedSidebar
      )}
    </>
  );
}
