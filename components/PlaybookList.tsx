'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Star, Trash2, Pencil, Copy, Check, Search, X, Tag, BookOpen } from 'lucide-react';
import { fetchArtifacts, deleteArtifact, updateArtifact } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface PlaybookArtifact {
  id: string;
  title: string;
  type: string;
  content: string;
  is_starred: boolean;
  created_at: string;
  metadata?: Record<string, any>;
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
        tags.forEach((t: string) => tagSet.add(t));
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
                  {play.metadata?.tags?.length > 0 && play.metadata.tags.slice(0, 2).map((t: string) => (
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
  );
}
