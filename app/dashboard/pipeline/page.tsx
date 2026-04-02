'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Plus, ChevronRight, Trash2, Phone, Building2,
  Linkedin, Mail, X, Check, ArrowLeft, Clock, FileText,
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

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string; badge: string }[] = [
  {
    key: 'lead',
    label: 'Lead',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
  },
  {
    key: 'connected',
    label: 'Connected',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  },
  {
    key: 'call_booked',
    label: 'Call Booked',
    color: 'text-indigo-700 dark:text-indigo-300',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
  },
  {
    key: 'pitch_done',
    label: 'Pitch Done',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
  },
  {
    key: 'client',
    label: 'Client',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
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

function sourceBadgeClass(source: Source | null): string {
  switch (source) {
    case 'linkedin': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
    case 'zoom': return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300';
    case 'lead_magnet': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-gray-700" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Contact</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Company + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/janedoe"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Source + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as Source)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as Stage)}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any context about this contact..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || !email.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Adding...' : 'Add Contact'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
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
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{displayName(contact)}</h2>
            {contact.email && displayName(contact) !== contact.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{contact.email}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {drawerError && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
              <span>{drawerError}</span>
              <button onClick={() => setDrawerError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
            </div>
          )}
          {/* Meta chips */}
          <div className="flex flex-wrap gap-2">
            {contact.company && (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                <Building2 className="w-3 h-3" />
                {contact.company}
              </span>
            )}
            {contact.source && (
              <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${sourceBadgeClass(contact.source)}`}>
                {contact.source === 'linkedin' && <Linkedin className="w-3 h-3" />}
                {contact.source.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Contact links */}
          <div className="space-y-2">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{contact.phone}</span>
              </a>
            )}
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <Linkedin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">LinkedIn Profile</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-50" />
              </a>
            )}
          </div>

          {/* Last contacted */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {markingContacted ? 'Saving...' : 'Mark Contacted'}
            </button>
          </div>

          {/* Stage selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stage</label>
            <select
              value={stage}
              onChange={e => handleStageChange(e.target.value as Stage)}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${stageMeta.color} ${stageMeta.bg} ${stageMeta.border} dark:bg-opacity-20`}
            >
              {STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Added date */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Added {formatDate(contact.created_at)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>

          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
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
  onClick: () => void;
  onDelete: () => void;
}

function ContactCard({ contact, onClick, onDelete }: CardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${displayName(contact)}?`)) return;
    onDelete();
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm p-3.5 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {(displayName(contact)[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName(contact)}</div>
            {contact.company && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delete button — visible on hover */}
        <button
          onClick={handleDelete}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
          title="Delete contact"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>

      {/* Source + last contacted */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        {contact.source && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${sourceBadgeClass(contact.source)}`}>
            {contact.source.replace('_', ' ')}
          </span>
        )}
        {contact.last_contacted_at && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            {formatDate(contact.last_contacted_at)}
          </span>
        )}
      </div>

      {/* Notes preview */}
      {contact.notes && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {contact.notes}
        </p>
      )}
    </button>
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
    } catch (err) {
      console.error('Pipeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) {
      router.push('/dashboard');
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

  const totalContacts = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <Users className="w-6 h-6 text-indigo-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalContacts} contact{totalContacts !== 1 ? 's' : ''} across {STAGES.length} stages
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>{pageError}</span>
            <button onClick={() => setPageError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
          </div>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex gap-4 min-w-max pb-4">
            {STAGES.map(stage => {
              const contacts = grouped[stage.key];
              return (
                <div key={stage.key} className="w-72 flex-shrink-0 flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl ${stage.bg} border ${stage.border}`}>
                    <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>
                      {contacts.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2.5">
                    {loading ? (
                      <ColumnSkeleton />
                    ) : contacts.length === 0 ? (
                      /* Empty state */
                      <div className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed ${stage.border} text-gray-400 dark:text-gray-500`}>
                        <Users className="w-6 h-6 mb-2 opacity-40" />
                        <span className="text-xs">No contacts</span>
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <ContactCard
                          key={contact.id}
                          contact={contact}
                          onClick={() => setSelectedContact(contact)}
                          onDelete={() => handleDeleteCard(contact)}
                        />
                      ))
                    )}
                  </div>

                  {/* Add to this column shortcut */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`flex items-center justify-center gap-1.5 w-full py-2 text-xs rounded-lg border border-dashed ${stage.border} ${stage.color} opacity-60 hover:opacity-100 transition-opacity`}
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
