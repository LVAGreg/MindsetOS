'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Star, Trash2, Pencil, Copy, Check, Search, X, Tag } from 'lucide-react';
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
    } catch {
      // Silently fail
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
    }).catch(() => {});
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
      } catch { /* revert on failure */ }
    }
    setEditingId(null);
  };

  const removePlay = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteArtifact(id);
      setPlays(prev => prev.filter(p => p.id !== id));
    } catch { /* silently fail */ }
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
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search plays..."
            className="w-full text-xs pl-6 pr-6 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#fcc824] focus:ring-1 focus:ring-[#fcc824]/30 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="px-2 pb-1.5 flex flex-wrap gap-1">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-full border transition-colors ${
                activeTag === tag
                  ? 'bg-[#fcc824] border-[#fcc824] text-black font-medium'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#fcc824]/50 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
              {activeTag === tag && <X className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
          Loading plays...
        </div>
      ) : plays.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
          {hasFilters
            ? 'No plays match your filters.'
            : 'No plays saved yet. Use "Save as Play" on any response.'}
        </div>
      ) : (
        <div className="space-y-0.5">
          {sorted.map(play => (
            <button
              key={play.id}
              onClick={() => openPlay(play)}
              onDoubleClick={(e) => startRename(e, play)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
            >
              <FileText className="w-3.5 h-3.5 text-[#fcc824] shrink-0" />
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
                    className="w-full text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#fcc824] rounded px-1 py-0.5 outline-none"
                  />
                ) : (
                  <div className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    {play.title || 'Untitled Play'}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                    {play.type}
                  </span>
                  {/* Inline tag chips */}
                  {play.metadata?.tags?.length > 0 && play.metadata.tags.slice(0, 2).map((t: string) => (
                    <span key={t} className="text-[9px] px-1 py-px bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {play.is_starred && (
                <Star className="w-3 h-3 text-yellow-500 shrink-0" fill="currentColor" />
              )}
              {/* Quick copy */}
              <button
                onClick={(e) => copyPlay(e, play)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#fcc824] transition-all shrink-0"
                title="Copy content"
              >
                {copiedId === play.id
                  ? <Check className="w-3 h-3 text-green-500" />
                  : <Copy className="w-3 h-3" />
                }
              </button>
              <button
                onClick={(e) => startRename(e, play)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#fcc824] transition-all shrink-0"
                title="Rename play"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => removePlay(e, play.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-all shrink-0"
                title="Delete play"
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
