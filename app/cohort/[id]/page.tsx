'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Megaphone,
  MessageSquare,
  ExternalLink,
  Brain,
  TrendingUp,
  Loader2,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return {
    Authorization: `Bearer ${token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cohort {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  current_participants: number;
  max_participants: number;
}

interface Enrollment {
  status: 'enrolled' | 'pending' | 'completed';
  enrolled_at?: string;
  completed_at?: string;
}

interface CohortConversation {
  id: string;
  title: string;
  is_announcement: boolean;
  created_at: string;
  reply_count?: number;
}

// ─── Helper: status badge ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  enrolled: {
    label: 'Enrolled',
    icon: CheckCircle2,
    bg: 'rgba(16,185,129,0.15)',
    color: '#34d399',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'rgba(252,200,36,0.15)',
    color: '#fcc824',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    bg: 'rgba(79,110,247,0.15)',
    color: '#4f6ef7',
  },
} as const;

function EnrollmentBadge({ status }: { status: Enrollment['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="w-4 h-4" />
      {cfg.label}
    </span>
  );
}

// ─── Helper: progress bar ─────────────────────────────────────────────────────

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#ededf5' }}>{label}</span>
        <span className="text-sm font-semibold" style={{ color: '#4f6ef7' }}>
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(to right, #4f6ef7, #7c5bf6)',
          }}
        />
      </div>
      <p className="mt-1 text-xs text-right" style={{ color: '#9090a8' }}>{pct}% complete</p>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#1e1e30' }}
    />
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      {/* header */}
      <div
        className="border-b px-4 py-5"
        style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
      {/* body */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CohortPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const cohortId = params.id;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [conversations, setConversations] = useState<CohortConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push(`/login?redirect=/cohort/${cohortId}`);
      return;
    }

    const headers = authHeaders();

    async function loadAll() {
      setIsLoading(true);
      setError(null);
      try {
        const [cohortRes, enrollmentRes, convsRes] = await Promise.all([
          fetch(`${API}/api/cohort/${cohortId}`, { headers }),
          fetch(`${API}/api/cohort/${cohortId}/enrollment`, { headers }),
          fetch(`${API}/api/cohort/${cohortId}/conversations`, { headers }),
        ]);

        if (!cohortRes.ok) {
          const msg = cohortRes.status === 404
            ? 'Cohort not found.'
            : 'Failed to load cohort details.';
          setError(msg);
          return;
        }

        const cohortData: Cohort = await cohortRes.json();
        setCohort(cohortData);

        if (enrollmentRes.ok) {
          const enrollData: Enrollment = await enrollmentRes.json();
          setEnrollment(enrollData);
        } else {
          // 404 means not enrolled — that's fine
          setEnrollment(null);
        }

        if (convsRes.ok) {
          const convsData = await convsRes.json();
          setConversations(Array.isArray(convsData) ? convsData : convsData.conversations ?? []);
        }
      } catch (err) {
        setError('Something went wrong. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAll();
  }, [cohortId, router]);

  // ── Enroll handler ──────────────────────────────────────────────────────────
  async function handleEnroll() {
    setIsEnrolling(true);
    setEnrollError(null);
    try {
      const res = await fetch(`${API}/api/cohort/${cohortId}/enroll`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEnrollError(body.message ?? 'Enrollment failed. Please try again.');
        return;
      }
      const data: Enrollment = await res.json();
      setEnrollment(data);
      // Update participant count optimistically
      if (cohort) {
        setCohort({ ...cohort, current_participants: cohort.current_participants + 1 });
      }
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Enrollment failed. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  }

  // ── Progress calculations ───────────────────────────────────────────────────
  function computeDayProgress(startDate: string, endDate: string) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    const elapsed = Math.max(0, Math.min(total, Math.round((now - start) / (1000 * 60 * 60 * 24))));
    return { elapsed, total };
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatRelative(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
  }

  // ── Render states ───────────────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#09090f' }}
      >
        <div
          className="max-w-md w-full rounded-xl border p-8 text-center"
          style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#f87171' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#ededf5' }}>
            Something went wrong
          </h2>
          <p className="mb-6" style={{ color: '#9090a8' }}>{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#4f6ef7', color: '#ededf5' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!cohort) return null;

  const { elapsed: daysElapsed, total: totalDays } = computeDayProgress(cohort.start_date, cohort.end_date);
  const isFull = cohort.current_participants >= cohort.max_participants;
  const announcements = conversations.filter((c) => c.is_announcement);
  const threads = conversations.filter((c) => !c.is_announcement);

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg transition-colors shrink-0"
                style={{ color: '#9090a8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e1e30'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Brain className="w-5 h-5" style={{ color: '#4f6ef7' }} />
                  <span
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: '#4f6ef7' }}
                  >
                    90-Day Mindset Architecture
                  </span>
                </div>
                <h1 className="text-xl font-bold leading-tight" style={{ color: '#ededf5' }}>
                  {cohort.name}
                </h1>
              </div>
            </div>
            {enrollment && <EnrollmentBadge status={enrollment.status} />}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Participants */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" style={{ color: '#4f6ef7' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#9090a8' }}
              >
                Participants
              </span>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#ededf5' }}>
              {cohort.current_participants}
              <span className="text-base font-normal" style={{ color: '#5a5a72' }}>
                /{cohort.max_participants}
              </span>
            </p>
            {isFull && (
              <p className="mt-1 text-xs font-medium" style={{ color: '#fcc824' }}>Cohort is full</p>
            )}
          </div>

          {/* Start date */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: '#4f6ef7' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#9090a8' }}
              >
                Start Date
              </span>
            </div>
            <p className="text-lg font-semibold" style={{ color: '#ededf5' }}>
              {formatDate(cohort.start_date)}
            </p>
          </div>

          {/* End date */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: '#7c5bf6' }} />
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: '#9090a8' }}
              >
                End Date
              </span>
            </div>
            <p className="text-lg font-semibold" style={{ color: '#ededf5' }}>
              {formatDate(cohort.end_date)}
            </p>
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────────────────── */}
        {cohort.description && (
          <div
            className="rounded-xl border p-5"
            style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
          >
            <p className="leading-relaxed" style={{ color: '#9090a8' }}>{cohort.description}</p>
          </div>
        )}

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            <h2 className="text-base font-semibold" style={{ color: '#ededf5' }}>Cohort Progress</h2>
          </div>
          <ProgressBar
            value={daysElapsed}
            max={totalDays}
            label="Days elapsed"
          />
          {enrollment && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: '#1e1e30' }}>
              <ProgressBar
                value={cohort.current_participants}
                max={cohort.max_participants}
                label="Seats filled"
              />
            </div>
          )}
        </div>

        {/* ── Enroll CTA (unenrolled users only) ───────────────────────────── */}
        {!enrollment && (
          <div
            className="rounded-xl border p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(79,110,247,0.12) 0%, rgba(124,91,246,0.12) 100%)',
              borderColor: 'rgba(79,110,247,0.35)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1" style={{ color: '#ededf5' }}>
                  Ready to start your 90-day journey?
                </h2>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  Join the cohort and redesign how you think, decide, and operate.
                </p>
                {enrollError && (
                  <p className="mt-2 text-sm font-medium" style={{ color: '#f87171' }}>{enrollError}</p>
                )}
              </div>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling || isFull}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                style={{
                  background: isEnrolling || isFull ? 'rgba(79,110,247,0.4)' : '#4f6ef7',
                  color: '#ededf5',
                  cursor: isEnrolling || isFull ? 'not-allowed' : 'pointer',
                }}
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enrolling...
                  </>
                ) : isFull ? (
                  'Cohort is Full'
                ) : (
                  'Enroll Now'
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Cohort Conversations ──────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            <h2 className="text-base font-semibold" style={{ color: '#ededf5' }}>Cohort Conversations</h2>
            {conversations.length > 0 && (
              <span className="ml-auto text-xs" style={{ color: '#9090a8' }}>
                {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div
              className="rounded-xl border p-10 text-center"
              style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
            >
              <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: '#5a5a72' }} />
              <p className="text-sm" style={{ color: '#9090a8' }}>No conversations yet. Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Announcements first */}
              {announcements.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  cohortId={cohortId}
                  formatRelative={formatRelative}
                />
              ))}
              {/* Regular threads */}
              {threads.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  cohortId={cohortId}
                  formatRelative={formatRelative}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ─── Conversation row component ───────────────────────────────────────────────

function ConversationRow({
  conversation,
  cohortId,
  formatRelative,
}: {
  conversation: CohortConversation;
  cohortId: string;
  formatRelative: (d: string) => string;
}) {
  const router = useRouter();

  function handleJoin() {
    router.push(`/cohort/${cohortId}/conversation/${conversation.id}`);
  }

  return (
    <div
      className="rounded-xl border p-4 flex items-center gap-4 transition-colors"
      style={{ background: 'rgba(18,18,31,0.8)', borderColor: '#1e1e30' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = conversation.is_announcement ? 'rgba(252,200,36,0.4)' : 'rgba(79,110,247,0.4)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30'; }}
    >
      {/* Icon */}
      <div
        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{
          background: conversation.is_announcement
            ? 'rgba(252,200,36,0.15)'
            : 'rgba(79,110,247,0.15)',
        }}
      >
        {conversation.is_announcement
          ? <Megaphone className="w-5 h-5" style={{ color: '#fcc824' }} />
          : <MessageSquare className="w-5 h-5" style={{ color: '#4f6ef7' }} />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate" style={{ color: '#ededf5' }}>
            {conversation.title}
          </p>
          {conversation.is_announcement && (
            <span
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
              style={{ background: 'rgba(252,200,36,0.15)', color: '#fcc824' }}
            >
              <Megaphone className="w-3 h-3" />
              Announcement
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs" style={{ color: '#9090a8' }}>
            {formatRelative(conversation.created_at)}
          </span>
          {typeof conversation.reply_count === 'number' && (
            <span className="text-xs" style={{ color: '#5a5a72' }}>
              {conversation.reply_count} {conversation.reply_count === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleJoin}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: '#4f6ef7', color: '#ededf5' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#3d5ce8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#4f6ef7'; }}
      >
        Join Discussion
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
