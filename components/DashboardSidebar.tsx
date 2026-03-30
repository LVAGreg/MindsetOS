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

import { useState } from 'react';
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
} from 'lucide-react';
import MindsetOSLogo from '@/components/MindsetOSLogo';
import { useAppStore } from '@/lib/store';

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
  viewAsUser?: any;
}

/* ─── Role badge ─────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const isPremium = role === 'power_user' || role === 'agency';
  const isAdmin = role === 'admin';

  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/20 text-[10px] font-bold text-purple-400 tracking-wide uppercase">
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
      className={`
        w-full flex items-center gap-3 px-3 py-3 rounded-xl
        transition-all duration-200 text-left group relative
        min-h-[44px]
        ${isActive
          ? 'bg-[#fcc824]/[0.06] text-[#fcc824] border border-[#fcc824]/[0.12]'
          : locked
            ? 'opacity-40 cursor-not-allowed text-gray-500'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
        }
        ${className}
      `}
    >
      {/* Active left-border indicator */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-[#fcc824]" />
      )}

      <span className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-[#fcc824]' : 'text-gray-500 group-hover:text-gray-300'}`}>
        {icon}
      </span>

      <span className={`text-sm font-medium flex-1 truncate ${isActive ? 'text-[#fcc824]' : ''}`}>
        {label}
      </span>

      {locked && <Lock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}

      {badge !== undefined && badge !== 0 && (
        <span className={`
          flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold
          ${isActive
            ? 'bg-[#fcc824] text-black'
            : 'bg-white/[0.08] text-gray-400'
          }
        `}>
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
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600">
        {children}
      </p>
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

  const isAdmin = effectiveUser?.role === 'admin';
  const isPowerUser = effectiveUser?.role === 'power_user';
  const isAgency = effectiveUser?.role === 'agency';
  const isPremium = isPowerUser || isAgency || isAdmin;

  /* ── Expanded sidebar ─────────────────────────────────── */
  const ExpandedSidebar = (
    <div className="w-[272px] flex flex-col h-full min-h-0
      sidebar-studio
      border-r border-white/[0.05]
      text-gray-100
      relative overflow-hidden
    ">
      {/* Ambient background orbs — depth without noise */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#fcc824]/[0.025] blur-[80px]" />
        <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-cyan-500/[0.015] blur-[80px]" />
      </div>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 px-4 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <MindsetOSLogo size="md" variant="light" />

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-gray-500 hover:text-gray-300"
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
          <span className="text-sm font-semibold text-gray-200">New Chat</span>
        </button>
      </div>

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
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">5 questions · free · takes 2 min</p>
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
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Unlock all 10 agents</p>
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

      {/* ── Footer: user profile ──────────────────────────── */}
      <div className="relative flex-shrink-0 border-t border-white/[0.05] p-3">

        {/* User menu popup */}
        {showUserMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="absolute bottom-full left-0 right-0 mb-2 mx-1 z-50
              bg-[#0f1520] border border-white/[0.08] rounded-2xl
              shadow-2xl shadow-black/50
              overflow-hidden
            ">
              {/* Profile header */}
              <div className="px-4 py-3 border-b border-white/[0.05]">
                {viewAsUser ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Viewing as</p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{effectiveUser?.name || effectiveUser?.email}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{effectiveUser?.role?.replace('_', ' ')}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Signed in as</p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">{user?.name || user?.email}</p>
                    <p className="text-[11px] text-gray-500 capitalize">{effectiveUser?.role?.replace('_', ' ')}</p>
                  </>
                )}
              </div>

              <div className="py-1.5">
                {/* Profile */}
                <button
                  onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors min-h-[44px]"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  <span>Profile & Settings</span>
                </button>

                {/* Search */}
                <button
                  onClick={() => { onSearch(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors min-h-[44px]"
                >
                  <Search className="w-4 h-4 text-gray-500" />
                  <span>Search Conversations</span>
                </button>

                {/* Feedback */}
                {onFeedbackClick && (
                  <button
                    onClick={() => { onFeedbackClick(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.05] transition-colors min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-500" />
                    <span>Send Feedback</span>
                    {unreadFeedbackCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                        {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Preferences divider */}
                <div className="mx-4 my-1 border-t border-white/[0.05]" />

                {/* Dark Mode */}
                <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                  <div className="flex items-center gap-2.5 text-sm text-gray-300">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-gray-500" />}
                    <span>Dark Mode</span>
                  </div>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium ${
                      theme === 'dark' ? 'bg-[#fcc824]' : 'bg-white/10'
                    }`}
                    aria-label="Toggle dark mode"
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                      theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Widgets toggle */}
                {user && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm text-gray-300">
                      <Sparkles className="w-4 h-4 text-gray-500" />
                      <span>Widgets</span>
                    </div>
                    <button
                      onClick={() => setWidgetFormattingEnabled(!widgetFormattingEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium ${
                        widgetFormattingEnabled ? 'bg-purple-500' : 'bg-white/10'
                      }`}
                      aria-label="Toggle widgets"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                        widgetFormattingEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Memory toggle — admin/power_user only */}
                {(isAdmin || isPowerUser) && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm text-gray-300">
                      <Brain className="w-4 h-4 text-gray-500" />
                      <span>Memory Context</span>
                    </div>
                    <button
                      onClick={() => setMemoryEnabled(!memoryEnabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium ${
                        memoryEnabled ? 'bg-blue-500' : 'bg-white/10'
                      }`}
                      aria-label="Toggle memory context"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                        memoryEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Playbook toggle */}
                {user && (
                  <div className="px-4 py-2.5 flex items-center justify-between min-h-[44px]">
                    <div className="flex items-center gap-2.5 text-sm text-gray-300">
                      <PanelRightOpen className="w-4 h-4 text-gray-500" />
                      <span>Playbook Panel</span>
                    </div>
                    <button
                      onClick={() => {
                        const store = useAppStore.getState();
                        store.setCanvasEnabled(!canvasEnabled);
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors toggle-premium ${
                        canvasEnabled ? 'bg-[#fcc824]' : 'bg-white/10'
                      }`}
                      aria-label="Toggle playbook panel"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                        canvasEnabled ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                )}

                {/* Upgrade — non-premium, non-agency */}
                {!isPremium && !isAdmin && (
                  <>
                    <div className="mx-4 my-1 border-t border-white/[0.05]" />
                    <button
                      onClick={() => { router.push('/agency'); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/[0.06] transition-colors min-h-[44px]"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Upgrade to Coaching Practice</span>
                    </button>
                  </>
                )}

                {/* Sign out */}
                <div className="mx-4 my-1 border-t border-white/[0.05]" />
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-colors min-h-[44px]"
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
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors group min-h-[44px]"
        >
          {/* Avatar */}
          <div
            className={`
              w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
              text-sm font-bold shadow-sm
              ${viewAsUser
                ? 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white'
                : isPremium
                  ? 'bg-gradient-to-br from-[#fcc824] to-amber-600 text-black'
                  : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-200'
              }
            `}
          >
            {(effectiveUser?.name?.[0] || effectiveUser?.email?.[0] || 'U').toUpperCase()}
          </div>

          {/* Name + role */}
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[13px] font-semibold text-gray-200 truncate leading-tight">
                {viewAsUser
                  ? (effectiveUser?.name || effectiveUser?.email)
                  : (user?.name || user?.email)
                }
              </p>
              {effectiveUser?.role && <RoleBadge role={effectiveUser.role} />}
            </div>
            {viewAsUser && (
              <p className="text-[11px] text-blue-400 font-medium leading-tight mt-0.5">viewing as</p>
            )}
          </div>

          <ChevronDown className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );

  /* ── Collapsed sidebar (desktop only) ──────────────────── */
  const CollapsedSidebar = (
    <div className="hidden md:flex w-[60px] flex-col h-full sidebar-studio border-r border-white/[0.05]">
      {/* Logo / expand */}
      <div className="px-2 py-3 border-b border-white/[0.05]">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors w-full flex items-center justify-center"
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
          className="p-3 hover:bg-[#fcc824]/[0.08] rounded-xl transition-colors group min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="New Chat"
          aria-label="New Chat"
        >
          <Plus className="w-5 h-5 text-gray-500 group-hover:text-[#fcc824] transition-colors" />
        </button>

        <button
          onClick={() => onSectionChange('agents')}
          className={`p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center group ${
            activeSection === 'agents' ? 'bg-[#fcc824]/[0.08] text-[#fcc824]' : 'hover:bg-white/[0.04]'
          }`}
          title="Agents"
          aria-label="Agents"
        >
          <Users className={`w-5 h-5 ${activeSection === 'agents' ? 'text-[#fcc824]' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`} />
        </button>

        <button
          onClick={() => onSectionChange('playbook')}
          className={`p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center group ${
            activeSection === 'playbook' ? 'bg-[#fcc824]/[0.08] text-[#fcc824]' : 'hover:bg-white/[0.04]'
          }`}
          title="Playbook"
          aria-label="Playbook"
        >
          <BookOpen className={`w-5 h-5 ${activeSection === 'playbook' ? 'text-[#fcc824]' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`} />
        </button>

        <button
          onClick={() => onSectionChange('conversations')}
          className={`p-3 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center group ${
            activeSection === 'conversations' ? 'bg-[#fcc824]/[0.08] text-[#fcc824]' : 'hover:bg-white/[0.04]'
          }`}
          title="Conversations"
          aria-label="Conversations"
        >
          <MessageSquare className={`w-5 h-5 ${activeSection === 'conversations' ? 'text-[#fcc824]' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`} />
        </button>

        <button
          onClick={onSearch}
          className="p-3 hover:bg-white/[0.04] rounded-xl transition-colors group min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </button>
      </div>

      {/* User avatar */}
      <div className="px-2 py-3 border-t border-white/[0.05]">
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-white/[0.04] rounded-xl transition-colors w-full flex items-center justify-center min-h-[44px]"
          title={user?.name || user?.email || 'Open sidebar'}
          aria-label="Open sidebar"
        >
          <div
            className={`
              w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm
              ${isPremium
                ? 'bg-gradient-to-br from-[#fcc824] to-amber-600 text-black'
                : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-200'
              }
            `}
          >
            {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden"
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
