'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, ChevronRight, Trash2, Phone, Building2,
  Linkedin, Mail, X, Check, ArrowLeft, Clock, FileText, Loader2, Lock,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'lead' | 'connected' | 'call_booked' | 'pitch_done' | 'client';
type Source = 'manual' | 'zoom' | 'linkedin' | 'lead_magnet';

interface Contact {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  linkedin_url: string | null;
  source: Source | null;
  stage: Stage;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

interface PipelineResponse {
  contacts: Contact[];
  grouped: Record<Stage, Contact[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; dotColor: string; headerBg: string; headerBorder: string; badgeBg: string; badgeText: string; emptyBorder: string }[] = [
  {
    key: 'lead',
    label: 'Lead',
    dotColor: '#4f6ef7',
    headerBg: 'rgba(79,110,247,0.08)',
    headerBorder: 'rgba(79,110,247,0.25)',
    badgeBg: 'rgba(79,110,247,0.18)',
    badgeText: '#8ba4fa',
    emptyBorder: 'rgba(79,110,247,0.2)',
  },
  {
    key: 'connected',
    label: 'Connected',
    dotColor: '#7c5bf6',
    headerBg: 'rgba(124,91,246,0.08)',
    headerBorder: 'rgba(124,91,246,0.25)',
    badgeBg: 'rgba(124,91,246,0.18)',
    badgeText: '#a98cf8',
    emptyBorder: 'rgba(124,91,246,0.2)',
  },
  {
    key: 'call_booked',
    label: 'Call Booked',
    dotColor: '#fcc824',
    headerBg: 'rgba(252,200,36,0.08)',
    headerBorder: 'rgba(252,200,36,0.25)',
    badgeBg: 'rgba(252,200,36,0.18)',
    badgeText: '#fcc824',
    emptyBorder: 'rgba(252,200,36,0.2)',
  },
  {
    key: 'pitch_done',
    label: 'Pitch Done',
    dotColor: '#fcc824',
    headerBg: 'rgba(252,200,36,0.08)',
    headerBorder: 'rgba(252,200,36,0.25)',
    badgeBg: 'rgba(252,200,36,0.18)',
    badgeText: '#fcc824',
    emptyBorder: 'rgba(252,200,36,0.2)',
  },
  {
    key: 'client',
    label: 'Client',
    dotColor: '#7c5bf6',
    headerBg: 'rgba(124,91,246,0.08)',
    headerBorder: 'rgba(124,91,246,0.25)',
    badgeBg: 'rgba(124,91,246,0.18)',
    badgeText: '#a98cf8',
    emptyBorder: 'rgba(124,91,246,0.2)',
  },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s])) as Record<Stage, typeof STAGES[0]>;

const SOURCES: { value: Source; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'lead_magnet', label: 'Lead Magnet' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(c: Contact): string {
  const parts = [c.first_name, c.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : c.email;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceBadgeStyle(source: Source | null): React.CSSProperties {
  switch (source) {
    case 'linkedin':   return { background: 'rgba(79,110,247,0.15)', color: '#8ba4fa' };
    case 'zoom':       return { background: 'rgba(124,91,246,0.15)', color: '#a98cf8' };
    case 'lead_magnet':return { background: 'rgba(252,200,36,0.15)', color: '#fcc824' };
    default:           return { background: 'rgba(144,144,168,0.15)', color: '#9090a8' };
  }
}

// ─── Input class shared across both modals ────────────────────────────────────

const inputCls = [
  'w-full px-3 py-2 text-sm rounded-lg',
  'border focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]',
  'placeholder-[#5a5a72]',
].join(' ');

const inputStyle: React.CSSProperties = {
  background: 'rgba(9,9,15,0.6)',
  borderColor: '#1e1e30',
  color: '#ededf5',
};

const labelCls = 'block text-sm font-medium mb-1';
const labelStyle: React.CSSProperties = { color: '#9090a8' };

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-xl" style={{ background: '#1e1e30' }} />
      ))}
    </div>
  );
}

// ─── Add Contact Modal ────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function AddContactModal({ onClose, onCreated }: AddModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [source, setSource] = useState<Source>('manual');
  const [stage, setStage] = useState<Stage>('lead');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/pipeline/contacts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          email: email.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          linkedin_url: linkedin.trim() || null,
          source,
          stage,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as any).error || 'Failed to create contact');
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(18,18,31,0.95)',
          border: '1px solid #1e1e30',
          backdropFilter: 'blur(20px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #1e1e30' }}
        >
          <h2 className="text-lg font-bold" style={{ color: '#ededf5' }}>Add Contact</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9090a8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1e30'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className={labelCls} style={labelStyle}>
              Email <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className={inputCls}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Company + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className={labelCls} style={labelStyle}>LinkedIn URL</label>
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/janedoe"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Source + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} style={labelStyle}>Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as Source)}
                className={inputCls}
                style={inputStyle}
              >
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as Stage)}
                className={inputCls}
                style={inputStyle}
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any context about this contact..."
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !email.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#4f6ef7' }}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#3d5ce0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#4f6ef7'; }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm rounded-lg transition-colors"
              style={{ color: '#9090a8' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#ededf5'; el.style.background = '#1e1e30'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#9090a8'; el.style.background = 'transparent'; }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact Drawer ───────────────────────────────────────────────────────────

interface DrawerProps {
  contact: Contact;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function ContactDrawer({ contact, onClose, onUpdated, onDeleted }: DrawerProps) {
  const [stage, setStage] = useState<Stage>(contact.stage);
  const [notes, setNotes] = useState(contact.notes || '');
  const [saving, setSaving] = useState(false);
  const [markingContacted, setMarkingContacted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastContacted, setLastContacted] = useState<string | null>(contact.last_contacted_at);
  const [dirty, setDirty] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    setDirty(true);
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setDrawerError(null);
    try {
      const res = await fetch(`${API}/api/pipeline/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ stage, notes: notes.trim() || null }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setDirty(false);
      onUpdated();
    } catch (err: any) {
      console.error(err);
      setDrawerError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkContacted = async () => {
    setMarkingContacted(true);
    setDrawerError(null);
    const now = new Date().toISOString();
    try {
      const res = await fetch(`${API}/api/pipeline/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ last_contacted_at: now }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setLastContacted(now);
      onUpdated();
    } catch (err: any) {
      console.error(err);
      setDrawerError(err?.message || 'Failed to mark contacted. Please try again.');
    } finally {
      setMarkingContacted(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${displayName(contact)}? This cannot be undone.`)) return;
    setDeleting(true);
    setDrawerError(null);
    try {
      const res = await fetch(`${API}/api/pipeline/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      onDeleted();
      onClose();
    } catch (err: any) {
      console.error(err);
      setDrawerError(err?.message || 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const stageMeta = STAGE_MAP[stage];

  return (
    <>
      {/* Overlay — closes on click */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md shadow-2xl flex flex-col"
        style={{
          background: 'rgba(18,18,31,0.97)',
          borderLeft: '1px solid #1e1e30',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-5 flex-shrink-0"
          style={{ borderBottom: '1px solid #1e1e30' }}
        >
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold truncate" style={{ color: '#ededf5' }}>{displayName(contact)}</h2>
            {contact.email && displayName(contact) !== contact.email && (
              <p className="text-sm mt-0.5 truncate" style={{ color: '#9090a8' }}>{contact.email}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: '#9090a8' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1e30'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {drawerError && (
            <div
              className="px-3 py-2 rounded-lg text-sm flex items-center justify-between"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <span>{drawerError}</span>
              <button onClick={() => setDrawerError(null)} aria-label="Dismiss error" className="ml-2" style={{ color: '#f87171' }}>✕</button>
            </div>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {contact.company && (
              <span
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(144,144,168,0.12)', color: '#9090a8' }}
              >
                <Building2 className="w-3 h-3" />
                {contact.company}
              </span>
            )}
            {contact.source && (
              <span
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                style={sourceBadgeStyle(contact.source)}
              >
                {contact.source === 'linkedin' && <Linkedin className="w-3 h-3" />}
                {contact.source.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Contact links */}
          <div className="space-y-2">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4f6ef7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4f6ef7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{contact.phone}</span>
              </a>
            )}
            {contact.linkedin_url && (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#4f6ef7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Linkedin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">LinkedIn Profile</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
              </a>
            )}
          </div>

          {/* Last contacted */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#9090a8' }}>
              <Clock className="w-4 h-4" />
              <span>
                {lastContacted
                  ? `Last contacted ${formatDate(lastContacted)}`
                  : 'Never contacted'}
              </span>
            </div>
            <button
              onClick={handleMarkContacted}
              disabled={markingContacted}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: 'rgba(79,110,247,0.1)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.2)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.1)'; }}
            >
              {markingContacted ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {markingContacted ? 'Saving...' : 'Mark Contacted'}
            </button>
          </div>

          {/* Stage selector */}
          <div>
            <label className={labelCls} style={labelStyle}>Stage</label>
            <select
              value={stage}
              onChange={e => handleStageChange(e.target.value as Stage)}
              className={`${inputCls} font-medium`}
              style={{
                background: stageMeta.headerBg,
                borderColor: stageMeta.headerBorder,
                color: stageMeta.dotColor,
              }}
            >
              {STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} style={labelStyle}>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Notes
              </span>
            </label>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              rows={5}
              placeholder="Add notes about this contact..."
              className={`${inputCls} resize-none`}
              style={inputStyle}
            />
          </div>

          {/* Added date */}
          <p className="text-xs" style={{ color: '#5a5a72' }}>
            Added {formatDate(contact.created_at)}
          </p>
        </div>

        {/* Footer */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #1e1e30' }}
        >
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            style={{ color: '#f87171' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>

          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#4f6ef7' }}
              onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLElement).style.background = '#3d5ce0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#4f6ef7'; }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

interface CardProps {
  contact: Contact;
  nextStage: Stage | null;
  onClick: () => void;
  onDelete: () => void;
  onMoveForward: () => void;
}

function ContactCard({ contact, nextStage, onClick, onDelete, onMoveForward }: CardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${displayName(contact)}?`)) return;
    onDelete();
  };

  const handleMoveForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMoveForward();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className="w-full text-left group rounded-xl p-3.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]"
      style={{
        background: 'rgba(18,18,31,0.8)',
        border: '1px solid #1e1e30',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a42'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30'; }}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c5bf6)' }}
          >
            {(displayName(contact)[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#ededf5' }}>{displayName(contact)}</div>
            {contact.company && (
              <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#5a5a72' }}>
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delete button — visible on hover */}
        <button
          onClick={handleDelete}
          aria-label="Delete contact"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
          title="Delete contact"
          style={{ color: '#f87171' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Source + last contacted */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {contact.source && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={sourceBadgeStyle(contact.source)}
          >
            {contact.source.replace('_', ' ')}
          </span>
        )}
        {contact.last_contacted_at && (
          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: '#5a5a72' }}>
            <Clock className="w-3 h-3" />
            {formatDate(contact.last_contacted_at)}
          </span>
        )}
      </div>

      {/* Notes preview */}
      {contact.notes && (
        <p className="mt-2 text-xs line-clamp-2 leading-relaxed" style={{ color: '#9090a8' }}>
          {contact.notes}
        </p>
      )}

      {/* Move to next stage */}
      {nextStage && (
        <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid rgba(30,30,48,0.6)' }}>
          <button
            onClick={handleMoveForward}
            aria-label={`Move to ${STAGE_MAP[nextStage].label}`}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all opacity-60 group-hover:opacity-100"
            style={{ background: 'rgba(79,110,247,0.08)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.15)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.16)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.08)'; }}
          >
            <ChevronRight className="w-3 h-3" />
            Move to {STAGE_MAP[nextStage].label}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const router = useRouter();
  const { user } = useAppStore();

  const [grouped, setGrouped] = useState<Record<Stage, Contact[]>>({
    lead: [], connected: [], call_booked: [], pitch_done: [], client: [],
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const isAllowed = user?.role === 'agency' || user?.role === 'power_user' || user?.role === 'admin';

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/pipeline/contacts`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: PipelineResponse = await res.json();
      setGrouped({
        lead: data.grouped?.lead || [],
        connected: data.grouped?.connected || [],
        call_booked: data.grouped?.call_booked || [],
        pitch_done: data.grouped?.pitch_done || [],
        client: data.grouped?.client || [],
      });
    } catch (err: any) {
      console.error('Pipeline fetch error:', err);
      setPageError(err?.message || 'Failed to load contacts. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) {
      setLoading(false);
      return;
    }
    fetchContacts();
  }, [isAllowed, fetchContacts]);

  const handleDeleteCard = async (contact: Contact) => {
    setPageError(null);
    try {
      const res = await fetch(`${API}/api/pipeline/contacts/${contact.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      fetchContacts();
    } catch (err: any) {
      console.error(err);
      setPageError(err?.message || 'Failed to delete contact. Please try again.');
    }
  };

  const handleMoveForward = async (contact: Contact, nextStage: Stage) => {
    setPageError(null);
    try {
      const res = await fetch(`${API}/api/pipeline/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ stage: nextStage }),
      });
      if (!res.ok) throw new Error('Failed to move contact');
      fetchContacts();
    } catch (err: any) {
      console.error(err);
      setPageError(err?.message || 'Failed to move contact. Please try again.');
    }
  };

  const STAGE_ORDER: Stage[] = ['lead', 'connected', 'call_booked', 'pitch_done', 'client'];
  const getNextStage = (current: Stage): Stage | null => {
    const idx = STAGE_ORDER.indexOf(current);
    return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
  };

  const totalContacts = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#09090f' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.2)' }}
          >
            <Users className="w-7 h-7" style={{ color: '#7c5bf6' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#ededf5' }}>Pipeline CRM</h2>
          <p className="text-sm mb-6" style={{ color: '#9090a8' }}>
            Track your leads and clients across every stage of your pipeline.
          </p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{ background: 'rgba(124,91,246,0.12)', border: '1px solid rgba(124,91,246,0.2)', color: '#7c5bf6' }}
          >
            <Lock className="w-3.5 h-3.5" />
            Available on Agency plan
          </div>
          <div>
            <button
              onClick={() => router.push('/join')}
              className="w-full py-3 text-sm font-semibold rounded-xl transition-all"
              style={{ background: '#fcc824', color: '#09090f' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              Upgrade to Agency
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }}>
      {/* Header */}
      <div
        className="flex-shrink-0"
        style={{ background: 'rgba(18,18,31,0.9)', borderBottom: '1px solid #1e1e30', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                aria-label="Back to dashboard"
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e1e30'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Users className="w-6 h-6" style={{ color: '#4f6ef7' }} />
              <div>
                <h1 className="text-xl font-bold" style={{ color: '#ededf5' }}>Pipeline</h1>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  {totalContacts} contact{totalContacts !== 1 ? 's' : ''} across {STAGES.length} stages
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              style={{ background: '#4f6ef7' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#3d5ce0'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#4f6ef7'; }}
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        </div>
      </div>

      {/* Page-level error */}
      {pageError && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4">
          <div
            className="px-4 py-3 rounded-lg text-sm flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
          >
            <span>{pageError}</span>
            <button onClick={() => setPageError(null)} aria-label="Dismiss error" className="ml-2" style={{ color: '#f87171' }}>✕</button>
          </div>
        </div>
      )}

      {/* Board — horizontal scroll on mobile */}
      <div className="flex-1 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
            {STAGES.map(stage => {
              const contacts = grouped[stage.key];
              return (
                <div key={stage.key} className="flex-shrink-0 flex flex-col gap-3" style={{ width: '288px', minWidth: '288px' }}>
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
                    style={{ background: stage.headerBg, border: `1px solid ${stage.headerBorder}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: stage.dotColor }}
                      />
                      <span className="text-sm font-semibold" style={{ color: stage.dotColor }}>{stage.label}</span>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: stage.badgeBg, color: stage.badgeText }}
                    >
                      {contacts.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2.5">
                    {loading ? (
                      <ColumnSkeleton />
                    ) : contacts.length === 0 ? (
                      /* Empty state */
                      <div
                        className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed"
                        style={{ borderColor: stage.emptyBorder, color: '#5a5a72' }}
                      >
                        <Users className="w-6 h-6 mb-2 opacity-40" />
                        <span className="text-xs">No contacts</span>
                      </div>
                    ) : (
                      contacts.map(contact => {
                        const ns = getNextStage(contact.stage);
                        return (
                          <ContactCard
                            key={contact.id}
                            contact={contact}
                            nextStage={ns}
                            onClick={() => setSelectedContact(contact)}
                            onDelete={() => handleDeleteCard(contact)}
                            onMoveForward={() => ns && handleMoveForward(contact, ns)}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Add to this column shortcut */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-1.5 w-full py-2 text-xs rounded-lg border border-dashed transition-opacity opacity-50 hover:opacity-100"
                    style={{ borderColor: stage.emptyBorder, color: stage.dotColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onCreated={fetchContacts}
        />
      )}

      {/* Contact Drawer */}
      {selectedContact && (
        <ContactDrawer
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdated={() => {
            fetchContacts();
            setSelectedContact(null);
          }}
          onDeleted={() => {
            fetchContacts();
            setSelectedContact(null);
          }}
        />
      )}
    </div>
  );
}
