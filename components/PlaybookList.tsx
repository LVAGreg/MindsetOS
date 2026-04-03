'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Star, Trash2, Pencil, Copy, Check, Search, X, Tag, BookOpen, Share2 } from 'lucide-react';
import { fetchArtifacts, deleteArtifact, updateArtifact } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface PlaybookArtifact {
  id: string;
  title: string;
  type: string;
  content: string;
  is_starred: boolean;
  created_at: string;
  agent_id?: string;
  metadata?: Record<string, string | string[] | boolean | number>;
}

// Hex accent colors keyed by agent slug — matches Tailwind classes in MINDSET_AGENTS
const AGENT_HEX: Record<string, string> = {
  'mindset-score':           '#f59e0b', // amber-500
  'reset-guide':             '#0ea5e9', // sky-500
  'architecture-coach':      '#7c3aed', // violet-600
  'practice-builder':        '#10b981', // emerald-500
  'story-excavator':         '#ea580c', // orange-600
  'launch-companion':        '#475569', // slate-600
  'accountability-partner':  '#16a34a', // green-600
  'conversation-curator':    '#14b8a6', // teal-500
  'decision-framework':      '#2563eb', // blue-600
  'inner-world-mapper':      '#ec4899', // pink-500
  'goal-architect':          '#eab308', // yellow-500
  'belief-debugger':         '#9333ea', // purple-600
  'morning-ritual-builder':  '#f43f5e', // rose-500
  'energy-optimizer':        '#84cc16', // lime-500
  'fear-processor':          '#dc2626', // red-600
  'relationship-architect':  '#06b6d4', // cyan-500
  'focus-trainer':           '#6366f1', // indigo-500
  'values-clarifier':        '#c026d3', // fuchsia-600
  'transformation-tracker':  '#22c55e', // green-500
  'content-architect':       '#f97316', // orange-500
};

const DEFAULT_ACCENT = '#7c5bf6';

function getAgentAccent(agentId?: string): string {
  if (!agentId) return DEFAULT_ACCENT;
  return AGENT_HEX[agentId] ?? DEFAULT_ACCENT;
}

function getAgentName(agentId?: string): string {
  if (!agentId) return 'MindsetOS';
  return agentId
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─── Share Card Modal ─────────────────────────────────────────────────────────

interface ShareCardModalProps {
  play: PlaybookArtifact;
  onClose: () => void;
}

function ShareCardModal({ play, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const accent = getAgentAccent(play.agent_id);
  const agentName = getAgentName(play.agent_id);
  const snippet = play.content.slice(0, 160) + (play.content.length > 160 ? '…' : '');

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${play.title}\n\n${play.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable */ }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // html2pdf.js is available (listed in package.json)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import('html2pdf.js')) as any;
      const html2pdf: (element?: HTMLElement) => {
        set: (opts: Record<string, unknown>) => ReturnType<typeof html2pdf>;
        from: (el: HTMLElement) => ReturnType<typeof html2pdf>;
        save: () => Promise<void>;
      } = mod.default ?? mod;
      const safeTitle = (play.title || 'insight-card')
        .replace(/[^a-z0-9\-_\s]/gi, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
      await html2pdf()
        .set({
          margin: 0,
          filename: `${safeTitle}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: '#09090f', useCORS: true },
          jsPDF: { unit: 'px', format: [420, 240], orientation: 'landscape' },
        })
        .from(cardRef.current)
        .save();
    } catch (err) {
      console.error('[ShareCard] Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share insight card"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9,9,15,0.82)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Dialog panel */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: '#111120',
          border: '1px solid #1e1e30',
          boxShadow: `0 24px 64px -12px rgba(9,9,15,0.9), 0 0 0 1px rgba(255,255,255,0.04)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a5a72' }}>
            Share Insight
          </span>
          <button
            aria-label="Close share dialog"
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: '#5a5a72' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#5a5a72'; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card preview */}
        <div className="px-4 pb-4">
          <div
            ref={cardRef}
            className="rounded-xl overflow-hidden"
            style={{
              background: '#09090f',
              border: '1px solid #1a1a2e',
            }}
          >
            {/* Accent bar */}
            <div style={{ height: '4px', background: accent }} />

            {/* Card body */}
            <div className="px-5 pt-4 pb-5">
              {/* Logo line */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: '#3a3a52' }}
                >
                  MindsetOS
                </span>
                <span
                  className="text-[10px] tracking-wide"
                  style={{ color: '#3a3a52' }}
                >
                  mindset.show
                </span>
              </div>

              {/* Title */}
              <h3
                className="text-sm font-semibold leading-snug mb-2"
                style={{ color: '#ededf5' }}
              >
                {play.title || 'Untitled Insight'}
              </h3>

              {/* Content snippet */}
              <p
                className="text-xs leading-relaxed mb-4"
                style={{ color: '#9090a8' }}
              >
                {snippet}
              </p>

              {/* Footer */}
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: accent }}
                />
                <span className="text-[10px]" style={{ color: '#5a5a72' }}>
                  {agentName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 px-4 pb-4"
          style={{ borderTop: '1px solid #1a1a2e', paddingTop: '12px', marginTop: '-1px' }}
        >
          <button
            aria-label="Copy insight text to clipboard"
            onClick={handleCopyText}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : '#1e1e30'}`,
              color: copied ? '#22c55e' : '#ededf5',
            }}
            onMouseEnter={e => {
              if (!copied) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.borderColor = '#2e2e46';
              }
            }}
            onMouseLeave={e => {
              if (!copied) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
              }
            }}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" /> Copied!</>
              : <><Copy className="w-3.5 h-3.5" /> Copy text</>
            }
          </button>

          <button
            aria-label="Download insight card as PDF"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: downloading ? 'rgba(124,91,246,0.08)' : 'rgba(124,91,246,0.12)',
              border: '1px solid rgba(124,91,246,0.35)',
              color: downloading ? '#9090a8' : '#c4b5fd',
              cursor: downloading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!downloading) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.2)';
                (e.currentTarget as HTMLElement).style.color = '#ededf5';
              }
            }}
            onMouseLeave={e => {
              if (!downloading) {
                (e.currentTarget as HTMLElement).style.background = 'rgba(124,91,246,0.12)';
                (e.currentTarget as HTMLElement).style.color = '#c4b5fd';
              }
            }}
          >
            <Share2 className="w-3.5 h-3.5" />
            {downloading ? 'Saving…' : 'Download card'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlaybookList() {
  const [plays, setPlays] = useState<PlaybookArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sharingPlay, setSharingPlay] = useState<PlaybookArtifact | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setCurrentArtifact = useAppStore(s => s.setCurrentArtifact);
  const setCanvasPanelOpen = useAppStore(s => s.setCanvasPanelOpen);
  const setCanvasContent = useAppStore(s => s.setCanvasContent);
  const playbookRefreshKey = useAppStore(s => s.playbookRefreshKey);
  const activeClientProfileId = useAppStore(s => s.activeClientProfileId);
  const viewAsUser = useAppStore(s => s.viewAsUser);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm]);

  // Extract unique tags from all loaded plays
  const extractTags = useCallback((artifacts: PlaybookArtifact[]) => {
    const tagSet = new Set<string>();
    artifacts.forEach(a => {
      const tags = a.metadata?.tags;
      if (Array.isArray(tags)) {
        (tags as string[]).forEach(t => tagSet.add(t));
      }
    });
    setAllTags(Array.from(tagSet).sort());
  }, []);

  const loadPlays = async (search?: string, tag?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchArtifacts({
        limit: 50,
        client_profile_id: activeClientProfileId || undefined,
        viewAsUserId: viewAsUser?.id || undefined,
        search: search || undefined,
        tag: tag || undefined,
      });
      const list = Array.isArray(data) ? data : [];
      setPlays(list);
      // Only update tags when loading without filters (to show all available tags)
      if (!search && !tag) {
        extractTags(list);
      }
    } catch (err: unknown) {
      console.error('[PlaybookList] Failed to load plays:', err);
      setError('Failed to load plays. Tap to retry.');
    } finally {
      setLoading(false);
    }
  };

  // Load all plays initially to get tags, then reload on filter changes
  useEffect(() => {
    loadPlays(debouncedSearch, activeTag);
  }, [playbookRefreshKey, activeClientProfileId, viewAsUser?.id, debouncedSearch, activeTag]);

  // Also load unfiltered set for tag extraction when refresh key changes
  useEffect(() => {
    if (!debouncedSearch && !activeTag) return;
    // Fetch unfiltered list in background just to update available tags
    fetchArtifacts({
      limit: 50,
      client_profile_id: activeClientProfileId || undefined,
      viewAsUserId: viewAsUser?.id || undefined,
    }).then(data => {
      extractTags(Array.isArray(data) ? data : []);
    }).catch((err: unknown) => {
      // Background tag refresh — non-blocking but log so failures are visible
      console.error('[PlaybookList] Failed to refresh tag list:', err);
    });
  }, [playbookRefreshKey, activeClientProfileId, viewAsUser?.id]);

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const openPlay = (play: PlaybookArtifact) => {
    if (editingId) return;
    setCurrentArtifact(play as any);
    setCanvasContent(play.content);
    setCanvasPanelOpen(true);
  };

  const openShare = (e: React.MouseEvent, play: PlaybookArtifact) => {
    e.stopPropagation();
    setSharingPlay(play);
  };

  const copyPlay = async (e: React.MouseEvent, play: PlaybookArtifact) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(play.content);
      setCopiedId(play.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const startRename = (e: React.MouseEvent, play: PlaybookArtifact) => {
    e.stopPropagation();
    setEditingId(play.id);
    setEditTitle(play.title || '');
  };

  const commitRename = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const play = plays.find(p => p.id === editingId);
    if (play && editTitle.trim() !== play.title) {
      try {
        await updateArtifact(editingId, { title: editTitle.trim() });
        setPlays(prev => prev.map(p => p.id === editingId ? { ...p, title: editTitle.trim() } : p));
      } catch (err: unknown) {
        console.error('[PlaybookList] Rename failed:', err);
        // Revert to original title — optimistic update was never applied so nothing to undo
      }
    }
    setEditingId(null);
  };

  const removePlay = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteArtifact(id);
      setPlays(prev => prev.filter(p => p.id !== id));
    } catch (err: unknown) {
      console.error('[PlaybookList] Delete failed:', err);
      setError('Could not delete play. Please try again.');
    }
  };

  // Sort: starred first, then by date
  const sorted = [...plays].sort((a, b) => {
    if (a.is_starred && !b.is_starred) return -1;
    if (!a.is_starred && b.is_starred) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasFilters = !!debouncedSearch || !!activeTag;

  return (
    <>
    {sharingPlay && (
      <ShareCardModal
        play={sharingPlay}
        onClose={() => setSharingPlay(null)}
      />
    )}
    <div>
      {/* Search input */}
      <div className="px-2 pt-1.5 pb-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: '#9090a8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search plays..."
            style={{
              background: 'rgba(18,18,31,0.8)',
              border: '1px solid #1e1e30',
              color: '#ededf5',
            }}
            className="w-full text-xs pl-6 pr-6 py-1.5 rounded-md outline-none focus:border-[#fcc824] focus:ring-1 focus:ring-[#fcc824]/30 transition-colors placeholder:text-[#5a5a72]"
          />
          {searchTerm && (
            <button
              aria-label="Clear search"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
              style={{ color: '#9090a8' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <button
          onClick={() => { setError(null); loadPlays(debouncedSearch, activeTag); }}
          className="w-full px-3 py-1.5 text-left text-xs transition-colors"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', borderTop: '1px solid rgba(239,68,68,0.25)', borderBottom: '1px solid rgba(239,68,68,0.25)' }}
        >
          {error}
        </button>
      )}

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-1">
          {allTags.map(tag => (
            <button
              key={tag}
              aria-label={activeTag === tag ? `Remove filter: ${tag}` : `Filter by tag: ${tag}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full transition-colors"
              style={
                activeTag === tag
                  ? { background: '#fcc824', border: '1px solid #fcc824', color: '#09090f', fontWeight: 500 }
                  : { background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30', color: '#9090a8' }
              }
              onMouseEnter={e => {
                if (activeTag !== tag) {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(252,200,36,0.5)';
                  (e.currentTarget as HTMLElement).style.color = '#ededf5';
                }
              }}
              onMouseLeave={e => {
                if (activeTag !== tag) {
                  (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
                  (e.currentTarget as HTMLElement).style.color = '#9090a8';
                }
              }}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
              {activeTag === tag && <X className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="px-3 py-2 text-xs" style={{ color: '#9090a8' }}>
          Loading plays...
        </div>
      ) : plays.length === 0 ? (
        hasFilters ? (
          <div className="px-3 py-2 text-xs" style={{ color: '#9090a8' }}>
            No plays match your filters.
          </div>
        ) : (
          /* On-brand empty state for no saved plays */
          <div className="px-3 py-4">
            <div
              className="rounded-xl border-dashed p-3.5 text-center"
              style={{ border: '1px dashed rgba(124,91,246,0.3)', background: 'rgba(124,91,246,0.04)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2.5"
                style={{ background: 'rgba(124,91,246,0.08)', border: '1.5px solid rgba(124,91,246,0.18)' }}
              >
                <BookOpen className="w-4 h-4" style={{ color: '#7c5bf6' }} />
              </div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#ededf5' }}>
                Your playbook is empty
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#9090a8' }}>
                Your insights will appear here as you work with your coaches. Hit &ldquo;Save as Play&rdquo; on any response.
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-0.5">
          {sorted.map(play => (
            <button
              key={play.id}
              onClick={() => openPlay(play)}
              onDoubleClick={(e) => startRename(e, play)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-md transition-colors group"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: '#fcc824' }} />
              <div className="flex-1 min-w-0">
                {editingId === play.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-xs rounded px-1 py-0.5 outline-none"
                    style={{
                      color: '#ededf5',
                      background: 'rgba(18,18,31,0.8)',
                      border: '1px solid #fcc824',
                    }}
                  />
                ) : (
                  <div className="text-xs truncate" style={{ color: '#ededf5' }}>
                    {play.title || 'Untitled Play'}
                  </div>
                )}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] capitalize" style={{ color: '#9090a8' }}>
                    {play.type}
                  </span>
                  {/* Inline tag chips */}
                  {Array.isArray(play.metadata?.tags) && (play.metadata.tags as string[]).slice(0, 2).map((t: string) => (
                    <span
                      key={t}
                      className="text-[9px] px-1 py-px rounded"
                      style={{ background: 'rgba(18,18,31,0.8)', color: '#5a5a72', border: '1px solid #1e1e30' }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {play.is_starred && (
                <Star className="w-3 h-3 shrink-0" fill="currentColor" style={{ color: '#fcc824' }} />
              )}
              {/* Share */}
              <button
                aria-label="Share insight card"
                onClick={(e) => openShare(e, play)}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-all shrink-0"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#7c5bf6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Share2 className="w-3 h-3" />
              </button>
              {/* Quick copy */}
              <button
                aria-label="Copy play content"
                onClick={(e) => copyPlay(e, play)}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-all shrink-0"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fcc824'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                {copiedId === play.id
                  ? <Check className="w-3 h-3" style={{ color: '#22c55e' }} />
                  : <Copy className="w-3 h-3" />
                }
              </button>
              <button
                aria-label="Rename play"
                onClick={(e) => startRename(e, play)}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-all shrink-0"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fcc824'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                aria-label="Delete play"
                onClick={(e) => removePlay(e, play.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 transition-all shrink-0"
                style={{ color: '#9090a8' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9090a8'; }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
