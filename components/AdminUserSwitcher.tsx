'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, ChevronDown, X, Search, Edit3, Clock, CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';
import { useAppStore } from '../lib/store';
import { apiClient } from '../lib/api-client';

interface AdminUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  conversation_count: number;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
  bgPage:    '#09090f',
  bgCard:    'rgba(18,18,31,0.8)',
  bgCardSolid: 'rgb(18,18,31)',
  border:    '#1e1e30',
  textPrimary: '#ededf5',
  textMuted:   '#9090a8',
  textDim:     '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  amberBg:   'rgba(252,200,36,0.12)',
  amberBorder:'rgba(252,200,36,0.25)',
  purple:    '#7c5bf6',
  green:     '#22c55e',
  greenBg:   'rgba(34,197,94,0.12)',
  greenBorder:'rgba(34,197,94,0.25)',
  blueBg:    'rgba(79,110,247,0.12)',
  blueBorder:'rgba(79,110,247,0.25)',
  red:       '#f87171',
  redBg:     'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.25)',
};

// Role badge: returns { color, background, border } style values
function roleStyle(role: string): React.CSSProperties {
  switch (role) {
    case 'admin':      return { color: TOKEN.red,    background: TOKEN.redBg,   border: `1px solid ${TOKEN.redBorder}` };
    case 'agency':     return { color: TOKEN.purple,  background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.25)' };
    case 'power_user': return { color: TOKEN.purple,  background: 'rgba(124,91,246,0.10)', border: '1px solid rgba(124,91,246,0.20)' };
    case 'trial':      return { color: TOKEN.green,   background: TOKEN.greenBg,  border: `1px solid ${TOKEN.greenBorder}` };
    default:           return { color: TOKEN.textMuted, background: 'rgba(144,144,168,0.10)', border: `1px solid ${TOKEN.border}` };
  }
}

export function AdminUserSwitcher() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [confirmingEdit, setConfirmingEdit] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectingUserId, setSelectingUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user, viewAsUser, setViewAsUser, impersonationSession, setImpersonationSession } = useAppStore();

  const isAdmin = user?.role === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch users when dropdown opens
  useEffect(() => {
    if (open && users.length === 0 && !loading) {
      setLoading(true);
      apiClient.get('/api/admin/users?limit=500')
        .then((data: AdminUser[] | { users: AdminUser[] }) => {
          const userList = Array.isArray(data) ? data : (data.users || []);
          setUsers(userList);
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch users:', err);
          setActionError('Failed to load users. Try again.');
        })
        .finally(() => setLoading(false));
    }
  }, [open, users.length, loading]);

  // Check for active impersonation session on mount
  useEffect(() => {
    if (isAdmin) {
      apiClient.getActiveImpersonation()
        .then((data: { session: any }) => {
          if (data.session) {
            setImpersonationSession({
              id: data.session.id,
              status: data.session.status,
              permissions: data.session.permissions,
              expires_at: data.session.expires_at,
            });
            setViewAsUser({
              id: data.session.target_user_id,
              email: data.session.target_email,
              name: `${data.session.target_first_name || ''} ${data.session.target_last_name || ''}`.trim() || data.session.target_email,
              firstName: data.session.target_first_name || undefined,
              lastName: data.session.target_last_name || undefined,
              role: data.session.target_role,
              emailVerified: true,
            });
          }
        })
        .catch(() => { /* no active session — silent is correct here */ });
    }
  }, [isAdmin]);

  // Poll for session status changes (when edit_requested, check if approved/declined)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!impersonationSession || impersonationSession.status !== 'edit_requested') return;

    intervalRef.current = setInterval(async () => {
      try {
        const data: { session: any } = await apiClient.getActiveImpersonation();
        if (data.session && data.session.status !== 'edit_requested') {
          setImpersonationSession({
            id: data.session.id,
            status: data.session.status,
            permissions: data.session.permissions,
            expires_at: data.session.expires_at,
          });
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err: any) {
        if (err?.status === 401) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
        console.error('[AdminUserSwitcher] Failed to poll impersonation session status:', err);
      }
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [impersonationSession?.status]);

  if (!isAdmin) return null;

  const filteredUsers = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const handleSelectUser = async (selectedUser: AdminUser) => {
    setSelectingUserId(selectedUser.id);
    try {
      const result = await apiClient.startImpersonation(selectedUser.id);
      setViewAsUser({
        id: selectedUser.id,
        email: selectedUser.email,
        name: `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email,
        firstName: selectedUser.first_name || undefined,
        lastName: selectedUser.last_name || undefined,
        role: selectedUser.role,
        emailVerified: true,
      });
      setImpersonationSession({
        id: result.session.id,
        status: 'viewing',
        permissions: result.session.permissions,
      });
      setOpen(false);
      setSearch('');
    } catch (err) {
      console.error('Failed to start impersonation:', err);
      setActionError('Failed to switch user. Try again.');
    } finally {
      setSelectingUserId(null);
    }
  };

  const handleRequestEdit = async () => {
    setRequestingEdit(true);
    setActionError(null);
    try {
      await apiClient.requestEditAccess();
      setImpersonationSession({
        ...impersonationSession,
        status: 'edit_requested',
      });
    } catch (err) {
      console.error('Failed to request edit access:', err);
      setActionError('Failed to request edit access.');
    } finally {
      setRequestingEdit(false);
    }
  };

  const handleEndSession = async () => {
    setEndingSession(true);
    setActionError(null);
    try {
      await apiClient.endImpersonation();
      setViewAsUser(null);
      setImpersonationSession(null);
    } catch (err) {
      console.error('Failed to end session:', err);
      setActionError('Failed to end session. Try again.');
    } finally {
      setEndingSession(false);
    }
  };

  const statusBadge = () => {
    if (!impersonationSession) return null;
    switch (impersonationSession.status) {
      case 'viewing':
        return (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
              background: TOKEN.blueBg, color: TOKEN.blue,
              border: `1px solid ${TOKEN.blueBorder}`,
            }}
          >
            <Eye style={{ width: 12, height: 12 }} /> View Only
          </span>
        );
      case 'edit_requested':
        return (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
              background: TOKEN.amberBg, color: TOKEN.amber,
              border: `1px solid ${TOKEN.amberBorder}`,
            }}
          >
            <Clock style={{ width: 12, height: 12 }} /> Edit Pending
          </span>
        );
      case 'edit_approved':
        return (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
              background: TOKEN.greenBg, color: TOKEN.green,
              border: `1px solid ${TOKEN.greenBorder}`,
            }}
          >
            <CheckCircle style={{ width: 12, height: 12 }} /> Edit Active
          </span>
        );
      case 'edit_declined':
        return (
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
              background: TOKEN.redBg, color: TOKEN.red,
              border: `1px solid ${TOKEN.redBorder}`,
            }}
          >
            <XCircle style={{ width: 12, height: 12 }} /> Edit Declined
          </span>
        );
      default:
        return null;
    }
  };

  // ── Active session banner ────────────────────────────────────────────────────
  if (viewAsUser && impersonationSession) {
    const canEdit = impersonationSession.status === 'edit_approved';
    const bannerBg     = canEdit ? TOKEN.greenBg  : TOKEN.blueBg;
    const bannerBorder = canEdit ? TOKEN.greenBorder : TOKEN.blueBorder;
    const iconColor    = canEdit ? TOKEN.green : TOKEN.blue;
    const labelColor   = canEdit ? TOKEN.green : TOKEN.blue;
    const textColor    = canEdit ? TOKEN.green : TOKEN.blue;

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px',
            background: bannerBg,
            border: `1px solid ${bannerBorder}`,
            borderRadius: 8,
            flexWrap: 'wrap',
          }}
        >
          {canEdit ? (
            <Edit3 style={{ width: 16, height: 16, color: iconColor, flexShrink: 0 }} />
          ) : (
            <Eye style={{ width: 16, height: 16, color: iconColor, flexShrink: 0 }} />
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1, color: labelColor }}>
              {canEdit ? 'Editing As' : 'Viewing'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: textColor, lineHeight: 1.2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {viewAsUser.name}
            </div>
          </div>
          {statusBadge()}

          {/* Request Edit button */}
          {impersonationSession.status === 'viewing' && !confirmingEdit && (
            <button
              onClick={() => setConfirmingEdit(true)}
              style={{
                marginLeft: 4, padding: '4px 8px',
                fontSize: 10, fontWeight: 700,
                background: TOKEN.amberBg,
                color: TOKEN.amber,
                border: `1px solid ${TOKEN.amberBorder}`,
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              title="Request permission to send messages and save playbooks as this user"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              Request Edit
            </button>
          )}

          {/* Confirm dialog for Request Edit */}
          {confirmingEdit && !requestingEdit && (
            <div style={{ marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: TOKEN.amber, fontWeight: 500, whiteSpace: 'nowrap' }}>Send request?</span>
              <button
                onClick={() => { setConfirmingEdit(false); handleRequestEdit(); }}
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 700,
                  background: TOKEN.amber, color: '#09090f',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmingEdit(false)}
                style={{
                  padding: '2px 6px', fontSize: 10, fontWeight: 700,
                  background: 'rgba(144,144,168,0.15)', color: TOKEN.textMuted,
                  border: `1px solid ${TOKEN.border}`, borderRadius: 4, cursor: 'pointer',
                }}
              >
                No
              </button>
            </div>
          )}
          {requestingEdit && (
            <div style={{ marginLeft: 4 }}>
              <Loader2 style={{ width: 12, height: 12, color: TOKEN.amber }} className="animate-spin" />
            </div>
          )}

          {/* End session button */}
          <button
            onClick={handleEndSession}
            disabled={endingSession}
            aria-label="End impersonation session"
            style={{
              marginLeft: 4, padding: 2,
              background: 'transparent',
              border: 'none', borderRadius: 4,
              cursor: endingSession ? 'not-allowed' : 'pointer',
              opacity: endingSession ? 0.5 : 1,
              transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center',
            }}
            title="End impersonation session"
            onMouseEnter={(e) => { if (!endingSession) (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
            onMouseLeave={(e) => { if (!endingSession) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          >
            {endingSession ? (
              <Loader2 style={{ width: 14, height: 14, color: TOKEN.textMuted }} className="animate-spin" />
            ) : (
              <X style={{ width: 14, height: 14, color: TOKEN.textMuted }} />
            )}
          </button>
        </div>
        {actionError && (
          <div style={{ marginTop: 4, fontSize: 12, padding: '4px 8px', borderRadius: 4, background: TOKEN.redBg, color: TOKEN.red, border: `1px solid ${TOKEN.redBorder}` }}>
            {actionError}
          </div>
        )}
      </div>
    );
  }

  // ── Default: selector button ─────────────────────────────────────────────────
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="View as user — admin switcher"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: TOKEN.bgCard,
          border: `1px solid ${TOKEN.border}`,
          borderRadius: 8,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = TOKEN.blue;
          el.style.boxShadow = `0 2px 8px rgba(79,110,247,0.25)`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = TOKEN.border;
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
        }}
      >
        <Shield style={{ width: 16, height: 16, color: TOKEN.textMuted, flexShrink: 0 }} />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1, color: TOKEN.textDim }}>
            View As
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TOKEN.textPrimary, lineHeight: 1.2 }}>
            User
          </div>
        </div>
        <ChevronDown
          style={{ width: 14, height: 14, color: TOKEN.textDim, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 8,
            width: 320,
            background: TOKEN.bgCardSolid,
            border: `1px solid ${TOKEN.border}`,
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${TOKEN.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield style={{ width: 16, height: 16, color: TOKEN.blue }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: TOKEN.textPrimary }}>View As User</span>
            </div>
            <p style={{ fontSize: 10, color: TOKEN.textDim, marginTop: 2 }}>
              Select a user to view their data. Edit requires their approval.
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: 8, borderBottom: `1px solid ${TOKEN.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: TOKEN.textDim }} />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  paddingLeft: 32, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                  fontSize: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${TOKEN.border}`,
                  borderRadius: 8,
                  color: TOKEN.textPrimary,
                  outline: 'none',
                }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = TOKEN.blue; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = TOKEN.border; }}
                autoFocus
              />
            </div>
          </div>

          {/* User list */}
          <div style={{ maxHeight: 256, overflowY: 'auto', padding: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, color: TOKEN.textMuted }}>
                <Loader2 style={{ width: 20, height: 20, margin: '0 auto 4px' }} className="animate-spin" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 14, color: TOKEN.textMuted }}>
                No users found
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelecting = selectingUserId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    disabled={selectingUserId !== null}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '8px 12px', borderRadius: 8,
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      cursor: selectingUserId !== null ? 'not-allowed' : 'pointer',
                      opacity: selectingUserId !== null && !isSelecting ? 0.5 : 1,
                      transition: 'background 0.1s, opacity 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!selectingUserId) (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `linear-gradient(135deg, rgba(79,110,247,0.3), rgba(124,91,246,0.3))`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelecting ? (
                        <Loader2 style={{ width: 14, height: 14, color: TOKEN.blue }} className="animate-spin" />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: TOKEN.blue }}>
                          {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: TOKEN.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.first_name || u.last_name
                          ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
                          : u.email}
                      </div>
                      <div style={{ fontSize: 12, color: TOKEN.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 9999, flexShrink: 0,
                        ...roleStyle(u.role),
                      }}
                    >
                      {u.role}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: `1px solid ${TOKEN.border}`,
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Eye style={{ width: 12, height: 12, color: TOKEN.blue }} />
              <span style={{ fontSize: 10, color: TOKEN.textDim }}>View-only by default. Request edit access after selecting.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
