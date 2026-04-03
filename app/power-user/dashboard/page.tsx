'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, MessageSquare, Clock, AlertCircle, Zap, X, FileText, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AssignedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  last_login: string | null;
  company: string | null;
  conversation_count: number;
}

interface ActiveTakeover {
  id: string;
  target_user_id: string;
  target_user_email: string;
  target_user_first_name: string | null;
  target_user_last_name: string | null;
  started_at: string;
  notes: string | null;
}

interface TakeoverIntent {
  userId: string;
  notes: string;
}

interface UserError {
  userId: string;
  message: string;
}

export default function PowerUserDashboard() {
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [activeTakeover, setActiveTakeover] = useState<ActiveTakeover | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [takeoverError, setTakeoverError] = useState<string | null>(null);

  // Inline confirm flow: which user we're about to start a session for
  const [takeoverIntent, setTakeoverIntent] = useState<TakeoverIntent | null>(null);
  const [startingTakeover, setStartingTakeover] = useState<string | null>(null);
  const [startTakeoverError, setStartTakeoverError] = useState<UserError | null>(null);
  const [startTakeoverSuccess, setStartTakeoverSuccess] = useState(false);

  // Inline confirm flow for ending a session
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endingTakeover, setEndingTakeover] = useState(false);
  const [endTakeoverError, setEndTakeoverError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setUsersError(null);
    setTakeoverError(null);

    // Split Promise.all so per-operation errors surface independently
    const [usersResult, takeoverResult] = await Promise.allSettled([
      apiClient.get('/api/power-user/users'),
      apiClient.get('/api/power-user/takeover/active'),
    ]);

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.users ?? []);
    } else {
      const err = usersResult.reason as Error;
      setUsersError(err?.message || 'Failed to load users');
    }

    if (takeoverResult.status === 'fulfilled') {
      setActiveTakeover(takeoverResult.value.takeover ?? null);
    } else {
      const err = takeoverResult.reason as Error;
      setTakeoverError(err?.message || 'Failed to load active session');
    }

    setLoading(false);
  };

  const handleRequestTakeover = (userId: string) => {
    setStartTakeoverError(null);
    setStartTakeoverSuccess(false);
    setTakeoverIntent({ userId, notes: '' });
  };

  const handleCancelIntent = () => {
    setTakeoverIntent(null);
    setStartTakeoverError(null);
  };

  const handleConfirmTakeover = async () => {
    if (!takeoverIntent) return;

    const { userId, notes } = takeoverIntent;
    setStartingTakeover(userId);
    setStartTakeoverError(null);
    setStartTakeoverSuccess(false);

    try {
      await apiClient.post(`/api/power-user/takeover/${userId}`, {
        notes: notes.trim() || undefined,
      });

      setTakeoverIntent(null);
      setStartTakeoverSuccess(true);

      // Reload to show active takeover banner
      await loadData();

      // Auto-clear success after 4 s
      setTimeout(() => setStartTakeoverSuccess(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      setStartTakeoverError({ userId, message });
    } finally {
      setStartingTakeover(null);
    }
  };

  const handleEndTakeover = async () => {
    if (!activeTakeover) return;

    setEndingTakeover(true);
    setEndTakeoverError(null);

    try {
      await apiClient.post(`/api/power-user/takeover/${activeTakeover.id}/end`, {});
      setConfirmEnd(false);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      setEndTakeoverError(message);
    } finally {
      setEndingTakeover(false);
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getUserDisplayName = (user: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) =>
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#7c5bf6', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8" style={{ color: '#7c5bf6' }} />
            <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>Coach Dashboard</h1>
          </div>
          <p style={{ color: '#9090a8' }}>Manage and support your assigned users</p>
        </div>

        {/* Session started success toast */}
        {startTakeoverSuccess && (
          <div
            className="flex items-center gap-3 rounded-lg p-4 mb-4"
            style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid #4f6ef7' }}
          >
            <CheckCircle className="h-5 w-5 shrink-0" style={{ color: '#4f6ef7' }} />
            <span style={{ color: '#ededf5' }}>Session started — you're now viewing this user's workspace.</span>
          </div>
        )}

        {/* Users load error */}
        {usersError && (
          <div
            className="flex items-center gap-3 rounded-lg p-4 mb-4"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#f87171' }} />
            <span style={{ color: '#ededf5' }}>Users: {usersError}</span>
          </div>
        )}

        {/* Takeover load error */}
        {takeoverError && (
          <div
            className="flex items-center gap-3 rounded-lg p-4 mb-4"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)' }}
          >
            <AlertCircle className="h-5 w-5 shrink-0" style={{ color: '#f87171' }} />
            <span style={{ color: '#ededf5' }}>Active session: {takeoverError}</span>
          </div>
        )}

        {/* Active Takeover Banner */}
        {activeTakeover && (
          <div
            className="rounded-xl p-6 mb-6"
            style={{ background: 'rgba(124,91,246,0.12)', border: '2px solid rgba(124,91,246,0.5)' }}
          >
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ background: '#7c5bf6' }}>
                  <Eye className="h-6 w-6" style={{ color: '#ededf5' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#ededf5' }}>
                    Active Coaching Session
                  </h3>
                  <p className="mb-2" style={{ color: '#9090a8' }}>
                    Viewing session for:{' '}
                    <span className="font-medium" style={{ color: '#ededf5' }}>
                      {activeTakeover.target_user_first_name && activeTakeover.target_user_last_name
                        ? `${activeTakeover.target_user_first_name} ${activeTakeover.target_user_last_name}`
                        : activeTakeover.target_user_email}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#9090a8' }}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Duration: {formatDuration(activeTakeover.started_at)}</span>
                    </div>
                    {activeTakeover.notes && (
                      <span>Notes: {activeTakeover.notes}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* End session: inline confirm or button */}
              {confirmEnd ? (
                <div
                  className="flex flex-col gap-2 rounded-lg p-4 shrink-0"
                  style={{ background: 'rgba(18,18,31,0.9)', border: '1px solid #1e1e30' }}
                >
                  <p className="text-sm font-medium" style={{ color: '#ededf5' }}>End this coaching session?</p>
                  {endTakeoverError && (
                    <p className="text-xs" style={{ color: '#f87171' }}>{endTakeoverError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleEndTakeover}
                      disabled={endingTakeover}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                      style={{ background: '#7c5bf6', color: '#ededf5' }}
                    >
                      {endingTakeover ? (
                        <>
                          <div className="animate-spin h-3.5 w-3.5 border-2 border-t-transparent rounded-full" style={{ borderColor: '#ededf5', borderTopColor: 'transparent' }} />
                          Ending…
                        </>
                      ) : (
                        'Yes, end it'
                      )}
                    </button>
                    <button
                      onClick={() => { setConfirmEnd(false); setEndTakeoverError(null); }}
                      disabled={endingTakeover}
                      className="flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                      style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#9090a8' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setConfirmEnd(true); setEndTakeoverError(null); }}
                  className="shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: '#7c5bf6', color: '#ededf5' }}
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: <Users className="h-5 w-5" style={{ color: '#7c5bf6' }} />,
              label: 'Total Users',
              value: users.length,
            },
            {
              icon: <MessageSquare className="h-5 w-5" style={{ color: '#4f6ef7' }} />,
              label: 'Total Conversations',
              value: users.reduce((sum, u) => sum + u.conversation_count, 0),
            },
            {
              icon: <Eye className="h-5 w-5" style={{ color: '#fcc824' }} />,
              label: 'Active Sessions',
              value: activeTakeover ? 1 : 0,
            },
          ].map(({ icon, label, value }) => (
            <div
              key={label}
              className="p-6 rounded-xl"
              style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
            >
              <div className="flex items-center gap-3 mb-2">
                {icon}
                <span className="text-sm" style={{ color: '#9090a8' }}>{label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: '#ededf5' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Users List */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #1e1e30' }}>
            <h2 className="text-xl font-semibold" style={{ color: '#ededf5' }}>Assigned Users</h2>
          </div>

          <div>
            {users.map((user, idx) => (
              <div
                key={user.id}
                style={{
                  borderTop: idx === 0 ? 'none' : '1px solid #1e1e30',
                }}
              >
                <div className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-base font-medium" style={{ color: '#ededf5' }}>
                          {getUserDisplayName(user)}
                        </h3>
                        {activeTakeover?.target_user_id === user.id && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{ background: 'rgba(124,91,246,0.2)', color: '#7c5bf6', border: '1px solid rgba(124,91,246,0.4)' }}
                          >
                            <Eye className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#9090a8' }}>
                        {user.company && <span>{user.company}</span>}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {user.conversation_count} conversations
                        </span>
                        <span>
                          Last login:{' '}
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString()
                            : 'Never'}
                        </span>
                      </div>

                      {/* Per-row start error */}
                      {startTakeoverError?.userId === user.id && (
                        <div className="flex items-center gap-2 mt-2">
                          <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#f87171' }} />
                          <span className="text-sm" style={{ color: '#f87171' }}>
                            {startTakeoverError.message}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Inline takeover intent panel or action button */}
                    {takeoverIntent?.userId === user.id ? (
                      <div
                        className="flex flex-col gap-3 rounded-lg p-4 shrink-0"
                        style={{
                          background: 'rgba(18,18,31,0.95)',
                          border: '1px solid #1e1e30',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: '#ededf5' }}>
                            Start session for {user.first_name ?? user.email}?
                          </span>
                          <button onClick={handleCancelIntent} style={{ color: '#5a5a72' }} className="hover:opacity-70 transition-opacity">
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-xs" style={{ color: '#9090a8' }}>
                            <FileText className="h-3.5 w-3.5" />
                            Coaching notes (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={takeoverIntent.notes}
                            onChange={(e) =>
                              setTakeoverIntent((prev) =>
                                prev ? { ...prev, notes: e.target.value } : prev
                              )
                            }
                            placeholder="e.g. Focus on decision framework work…"
                            className="w-full rounded-md px-3 py-2 text-sm resize-none outline-none transition-colors"
                            style={{
                              background: 'rgba(9,9,15,0.8)',
                              border: '1px solid #1e1e30',
                              color: '#ededf5',
                            }}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmTakeover}
                            disabled={startingTakeover === user.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                            style={{ background: '#7c5bf6', color: '#ededf5' }}
                          >
                            {startingTakeover === user.id ? (
                              <>
                                <div
                                  className="animate-spin h-3.5 w-3.5 border-2 border-t-transparent rounded-full"
                                  style={{ borderColor: '#ededf5', borderTopColor: 'transparent' }}
                                />
                                Starting…
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                Confirm
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelIntent}
                            disabled={startingTakeover === user.id}
                            className="flex-1 px-3 py-2.5 rounded-md text-sm font-medium transition-opacity disabled:opacity-50"
                            style={{
                              background: 'rgba(18,18,31,0.8)',
                              border: '1px solid #1e1e30',
                              color: '#9090a8',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestTakeover(user.id)}
                        disabled={!!activeTakeover || startingTakeover === user.id}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: '#7c5bf6', color: '#ededf5' }}
                      >
                        <Eye className="h-4 w-4" />
                        Start Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {users.length === 0 && !usersError && (
              <div className="text-center py-12" style={{ color: '#5a5a72' }}>
                No assigned users yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
