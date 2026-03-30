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
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
} as const;

function EnrollmentBadge({ status }: { status: Enrollment['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.classes}`}>
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">{pct}% complete</p>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`} />
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-5">
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
    } catch {
      setEnrollError('Enrollment failed. Please try again.');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                    90-Day Mindset Architecture
                  </span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
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
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Participants
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {cohort.current_participants}
              <span className="text-base font-normal text-gray-400 dark:text-gray-500">
                /{cohort.max_participants}
              </span>
            </p>
            {isFull && (
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">Cohort is full</p>
            )}
          </div>

          {/* Start date */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Start Date
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(cohort.start_date)}
            </p>
          </div>

          {/* End date */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                End Date
              </span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(cohort.end_date)}
            </p>
          </div>
        </div>

        {/* ── Description ──────────────────────────────────────────────────── */}
        {cohort.description && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{cohort.description}</p>
          </div>
        )}

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Cohort Progress</h2>
          </div>
          <ProgressBar
            value={daysElapsed}
            max={totalDays}
            label="Days elapsed"
          />
          {enrollment && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
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
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Ready to start your 90-day journey?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Join the cohort and redesign how you think, decide, and operate.
                </p>
                {enrollError && (
                  <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{enrollError}</p>
                )}
              </div>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling || isFull}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
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
            <MessageSquare className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Cohort Conversations</h2>
            {conversations.length > 0 && (
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
              <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet. Check back soon.</p>
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-center gap-4 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
      {/* Icon */}
      <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
        conversation.is_announcement
          ? 'bg-amber-100 dark:bg-amber-900/40'
          : 'bg-indigo-100 dark:bg-indigo-900/40'
      }`}>
        {conversation.is_announcement
          ? <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          : <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {conversation.title}
          </p>
          {conversation.is_announcement && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
              <Megaphone className="w-3 h-3" />
              Announcement
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelative(conversation.created_at)}
          </span>
          {typeof conversation.reply_count === 'number' && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {conversation.reply_count} {conversation.reply_count === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleJoin}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
      >
        Join Discussion
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
