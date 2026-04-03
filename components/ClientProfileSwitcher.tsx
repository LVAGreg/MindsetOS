'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, User, Check, Settings, Loader2 } from 'lucide-react';
import { useAppStore } from '../lib/store';
import type { ClientProfile } from '../lib/store';

// Design tokens
const T = {
  bg:        '#09090f',
  bgPanel:   'rgba(18,18,31,0.8)',
  bgCard:    '#1e1e30',
  textMain:  '#ededf5',
  textMuted: '#9090a8',
  textDim:   '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
} as const;

const PROFILE_COLORS = ['#4f6ef7', '#10b981', '#fcc824', '#ef4444', '#7c5bf6', '#ec4899', '#06b6d4', '#f97316'];

export function ClientProfileSwitcher() {
  const router = useRouter();
  const [open, setOpen]             = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    user,
    viewAsUser,
    clientProfiles,
    activeClientProfileId,
    fetchClientProfiles,
    createClientProfile,
    setActiveClientProfile,
  } = useAppStore();

  const effectiveUser    = viewAsUser || user;
  const isAgencyOrAdmin  = effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin';

  // Fetch profiles on mount, when role changes, or when viewAs user changes
  useEffect(() => {
    if (isAgencyOrAdmin) {
      fetchClientProfiles();
    }
  }, [isAgencyOrAdmin, fetchClientProfiles, viewAsUser?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Don't render for non-agency/admin users
  if (!isAgencyOrAdmin) return null;

  const activeProfile = clientProfiles.find(cp => cp.id === activeClientProfileId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const colorIdx = clientProfiles.length % PROFILE_COLORS.length;
      const profile = await createClientProfile({
        clientName: newName.trim(),
        industry:   newIndustry.trim() || undefined,
        color:      PROFILE_COLORS[colorIdx],
      });
      setActiveClientProfile(profile.id);
      setNewName('');
      setNewIndustry('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client profile');
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (profileId: string | null) => {
    setActiveClientProfile(profileId);
    setOpen(false);
  };

  // Trigger button: active profile style vs default style
  const triggerStyle: React.CSSProperties = activeProfile
    ? {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.75rem',
        border: `1px solid ${T.blue}`,
        borderRadius: '0.5rem',
        background: `linear-gradient(to right, rgba(79,110,247,0.15), rgba(124,91,246,0.12))`,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s',
      }
    : {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.375rem 0.75rem',
        border: `1px solid ${T.bgCard}`,
        borderRadius: '0.5rem',
        background: T.bgCard,
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.15s',
      };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        style={triggerStyle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeProfile ? (
          <div
            style={{
              width: '0.625rem', height: '0.625rem',
              borderRadius: '50%', flexShrink: 0,
              backgroundColor: activeProfile.color || T.blue,
            }}
          />
        ) : (
          <Building2 style={{ width: '1rem', height: '1rem', color: T.textMuted, flexShrink: 0 }} />
        )}
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontSize: '0.625rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            lineHeight: 1, color: T.blue,
          }}>
            Client
          </div>
          <div style={{
            fontSize: '0.875rem', fontWeight: 700,
            color: T.textMain, lineHeight: 1.25,
            maxWidth: '7.5rem', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {activeProfile?.clientName || 'My Business'}
          </div>
        </div>
        <ChevronDown style={{
          width: '0.875rem', height: '0.875rem',
          color: T.textDim,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0,
            marginTop: '0.5rem', width: '18rem',
            background: T.bgCard,
            border: `1px solid ${T.textDim}`,
            borderRadius: '0.75rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 50, overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.5rem 0.75rem',
            borderBottom: `1px solid ${T.textDim}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 style={{ width: '1rem', height: '1rem', color: T.blue }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: T.textMain }}>
                Client Profiles
              </span>
            </div>
          </div>

          {/* Profile list */}
          <div style={{ padding: '0.5rem' }}>
            {/* Personal context option */}
            <button
              role="option"
              aria-selected={!activeClientProfileId}
              onClick={() => handleSelect(null)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: '0.75rem', padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem', textAlign: 'left',
                background: !activeClientProfileId
                  ? `rgba(79,110,247,0.15)`
                  : 'transparent',
                border: 'none', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (activeClientProfileId)
                  (e.currentTarget as HTMLElement).style.background = `rgba(144,144,168,0.1)`;
              }}
              onMouseLeave={(e) => {
                if (activeClientProfileId)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <User style={{
                width: '1rem', height: '1rem', flexShrink: 0,
                color: !activeClientProfileId ? T.blue : T.textMuted,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem', fontWeight: 500,
                  color: !activeClientProfileId ? T.textMain : T.textMuted,
                }}>
                  My Business
                </div>
                <div style={{ fontSize: '0.75rem', color: T.textDim }}>
                  Personal context
                </div>
              </div>
              {!activeClientProfileId && (
                <Check style={{ width: '1rem', height: '1rem', color: T.blue }} />
              )}
            </button>

            {/* Client profile list */}
            {clientProfiles.map((cp) => (
              <button
                key={cp.id}
                role="option"
                aria-selected={activeClientProfileId === cp.id}
                onClick={() => handleSelect(cp.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: '0.75rem', padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem', textAlign: 'left',
                  background: activeClientProfileId === cp.id
                    ? `rgba(79,110,247,0.15)`
                    : 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (activeClientProfileId !== cp.id)
                    (e.currentTarget as HTMLElement).style.background = `rgba(144,144,168,0.1)`;
                }}
                onMouseLeave={(e) => {
                  if (activeClientProfileId !== cp.id)
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '1rem', height: '1rem',
                    borderRadius: '50%', flexShrink: 0,
                    backgroundColor: cp.color || T.blue,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: 500,
                    color: activeClientProfileId === cp.id ? T.textMain : T.textMuted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cp.clientName}
                  </div>
                  {cp.industry && (
                    <div style={{
                      fontSize: '0.75rem', color: T.textDim,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {cp.industry}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.625rem', color: T.textDim, flexShrink: 0 }}>
                  {cp.conversationCount}c
                </div>
                {activeClientProfileId === cp.id && (
                  <Check style={{ width: '1rem', height: '1rem', color: T.blue }} />
                )}
              </button>
            ))}
          </div>

          {/* Create new client */}
          <div style={{ borderTop: `1px solid ${T.textDim}`, padding: '0.5rem' }}>
            {showCreate ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.25rem' }}>
                <input
                  type="text"
                  placeholder="Client name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                  style={{
                    width: '100%', padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: `1px solid ${T.textDim}`,
                    borderRadius: '0.5rem',
                    background: T.bg,
                    color: T.textMain,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = T.blue;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px rgba(79,110,247,0.25)`;
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = T.textDim;
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                />
                <input
                  type="text"
                  placeholder="Industry (optional)"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  style={{
                    width: '100%', padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: `1px solid ${T.textDim}`,
                    borderRadius: '0.5rem',
                    background: T.bg,
                    color: T.textMain,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = T.blue;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px rgba(79,110,247,0.25)`;
                  }}
                  onBlur={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = T.textDim;
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                />
                {error && (
                  <div style={{ fontSize: '0.75rem', color: '#ef4444', padding: '0 0.25rem' }}>
                    {error}
                  </div>
                )}
                {/* Button row — flex-wrap for mobile */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem', fontWeight: 500,
                      color: T.bg,
                      background: creating || !newName.trim() ? T.textDim : T.blue,
                      border: 'none', borderRadius: '0.5rem',
                      cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                      opacity: creating || !newName.trim() ? 0.6 : 1,
                      minWidth: '5rem',
                    }}
                    aria-busy={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2
                          style={{ width: '0.875rem', height: '0.875rem', animation: 'spin 1s linear infinite' }}
                        />
                        Creating…
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); setNewIndustry(''); setError(null); }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.875rem',
                      color: T.textMuted,
                      background: 'transparent',
                      border: 'none', borderRadius: '0.5rem',
                      cursor: 'pointer', transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = T.textMain;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = T.textMuted;
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Action row — flex-wrap for mobile */
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowCreate(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center',
                    gap: '0.5rem', padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem', color: T.blue,
                    background: 'transparent',
                    border: 'none', borderRadius: '0.5rem',
                    cursor: 'pointer', transition: 'background 0.15s',
                    minWidth: '7rem',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `rgba(79,110,247,0.12)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Plus style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  <span>Add Client</span>
                </button>
                <button
                  onClick={() => { setOpen(false); router.push('/dashboard/clients'); }}
                  aria-label="Manage all clients"
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: '0.25rem', padding: '0.5rem',
                    fontSize: '0.875rem', color: T.textMuted,
                    background: 'transparent',
                    border: 'none', borderRadius: '0.5rem',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = `rgba(144,144,168,0.1)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Settings style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyframe for spinner — injected inline */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
