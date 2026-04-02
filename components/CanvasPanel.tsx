'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Copy,
  Download,
  FileText,
  Star,
  Check,
  Maximize2,
  Minimize2,
  List,
  ArrowLeft,
  Sparkles,
  Presentation,
  Search,
  Tag,
  Plus,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createArtifact, updateArtifact, toggleArtifactStar, fetchArtifacts, cleanupArtifact, updateArtifactTags } from '@/lib/api-client';
import { PlaybookSlideView } from './PlaybookSlideView';

// Play type options shared between label rendering and the <select>
const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'document',  label: 'Document'      },
  { value: 'framework', label: 'Framework'     },
  { value: 'campaign',  label: 'Campaign Plan' },
  { value: 'profile',   label: 'Profile'       },
  { value: 'script',    label: 'Script'        },
  { value: 'email',     label: 'Email'         },
  { value: 'code',      label: 'Code'          },
  { value: 'mindset-score', label: 'Mindset Score' },
  { value: 'practice',  label: 'Practice Plan'  },
  { value: 'exercise',  label: 'Exercise'       },
];

interface BrowseArtifact {
  id: string;
  title: string;
  type: string;
  content: string;
  is_starred: boolean;
  created_at: string;
  version?: number;
}

export function CanvasPanel() {
  // ── Store ────────────────────────────────────────────────────────────────
  const canvasContent      = useAppStore(s => s.canvasContent);
  const canvasMessageId    = useAppStore(s => s.canvasMessageId);
  const currentArtifact    = useAppStore(s => s.currentArtifact);
  const closeCanvas            = useAppStore(s => s.closeCanvas);
  const setCurrentArtifact     = useAppStore(s => s.setCurrentArtifact);
  const setCanvasContent       = useAppStore(s => s.setCanvasContent);
  const triggerPlaybookRefresh = useAppStore(s => s.triggerPlaybookRefresh);
  const viewAsUser             = useAppStore(s => s.viewAsUser);
  const activeClientProfileId  = useAppStore(s => s.activeClientProfileId);

  // ── Local state ──────────────────────────────────────────────────────────
  const [copied,       setCopied]       = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [starring,     setStarring]     = useState(false);
  const [cleaning,     setCleaning]     = useState(false);
  const [cleanResult,  setCleanResult]  = useState<string | null>(null);
  const [isFullWidth,  setIsFullWidth]  = useState(false);
  const [artifactType, setArtifactType] = useState<string>(
    currentArtifact?.type ?? 'document'
  );
  const [title, setTitle] = useState<string>('');

  // ── Browse mode state ────────────────────────────────────────────────────
  const [showBrowser, setShowBrowser]       = useState(false);
  const [browseList, setBrowseList]         = useState<BrowseArtifact[]>([]);
  const [browseLoading, setBrowseLoading]   = useState(false);
  const [copiedBrowseId, setCopiedBrowseId] = useState<string | null>(null);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  // ── Browse search & tag filtering ────────────────────────────────────────
  const [browseSearch, setBrowseSearch]           = useState('');
  const [browseDebouncedSearch, setBrowseDebouncedSearch] = useState('');
  const [browseActiveTag, setBrowseActiveTag]     = useState<string | null>(null);
  const [browseAllTags, setBrowseAllTags]         = useState<string[]>([]);
  const browseSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tag editor state (for detail view) ──────────────────────────────────
  const [tagInput, setTagInput]           = useState('');
  const [editingTags, setEditingTags]     = useState(false);
  const [savingTags, setSavingTags]       = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showSlideView, setShowSlideView] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download menu on outside click
  useEffect(() => {
    if (!showDownloadMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDownloadMenu]);

  // ── Browse search debounce ──────────────────────────────────────────────
  useEffect(() => {
    if (browseSearchTimerRef.current) clearTimeout(browseSearchTimerRef.current);
    browseSearchTimerRef.current = setTimeout(() => {
      setBrowseDebouncedSearch(browseSearch);
    }, 300);
    return () => {
      if (browseSearchTimerRef.current) clearTimeout(browseSearchTimerRef.current);
    };
  }, [browseSearch]);

  // Extract unique tags from browse list
  const extractBrowseTags = useCallback((artifacts: BrowseArtifact[]) => {
    const tagSet = new Set<string>();
    artifacts.forEach(a => {
      const tags = (a as any).metadata?.tags;
      if (Array.isArray(tags)) {
        tags.forEach((t: string) => tagSet.add(t));
      }
    });
    setBrowseAllTags(Array.from(tagSet).sort());
  }, []);

  // Content to display: prefer the saved artifact, fall back to raw canvas content
  const content = currentArtifact?.content ?? canvasContent ?? '';

  // ── Derive title from content when not already set ───────────────────────
  useEffect(() => {
    if (currentArtifact?.title) {
      setTitle(currentArtifact.title);
      setArtifactType(currentArtifact.type);
      return;
    }
    if (content) {
      const headingMatch = content.match(/^#{1,6} (.+)/m);
      const firstLine    = content.split('\n')[0]?.replace(/[#*_`]/g, '').trim();
      setTitle(headingMatch?.[1] ?? firstLine?.substring(0, 80) ?? 'Untitled');
    }
  }, [content, currentArtifact]);

  // ── Load browse list when opened or filters change ───────────────────────
  useEffect(() => {
    if (showBrowser) {
      loadBrowseList(browseDebouncedSearch, browseActiveTag);
    }
  }, [showBrowser, browseDebouncedSearch, browseActiveTag]);

  // Load unfiltered list for tag extraction when browser opens
  useEffect(() => {
    if (showBrowser) {
      fetchArtifacts({ limit: 100, client_profile_id: activeClientProfileId || undefined, viewAsUserId: viewAsUser?.id || undefined })
        .then(data => extractBrowseTags(Array.isArray(data) ? data : []))
        .catch((err: unknown) => {
          // Background tag refresh — non-blocking but log so failures are visible
          console.error('[CanvasPanel] Failed to refresh browse tag list:', err);
        });
    }
  }, [showBrowser]);

  const loadBrowseList = async (search?: string, tag?: string | null) => {
    setBrowseLoading(true);
    try {
      const data = await fetchArtifacts({
        limit: 50,
        client_profile_id: activeClientProfileId || undefined,
        viewAsUserId: viewAsUser?.id || undefined,
        search: search || undefined,
        tag: tag || undefined,
      });
      const list = Array.isArray(data) ? data : [];
      // Sort: starred first, then newest
      list.sort((a: BrowseArtifact, b: BrowseArtifact) => {
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setBrowseList(list);
    } catch { setBrowseList([]); }
    finally { setBrowseLoading(false); }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  const handleDownload = async (format: 'md' | 'txt' | 'pdf' | 'html' | 'docx') => {
    const safeName = (title || 'artifact')
      .replace(/[^a-z0-9\s-]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();

    if (format === 'docx') {
      try {
        const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx');
        const paragraphs: InstanceType<typeof Paragraph>[] = [];
        const lines = content.split('\n');
        for (const line of lines) {
          if (line.startsWith('# ')) {
            paragraphs.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
          } else if (line.startsWith('## ')) {
            paragraphs.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
          } else if (line.startsWith('### ')) {
            paragraphs.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            paragraphs.push(new Paragraph({
              text: line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1'),
              bullet: { level: 0 },
            }));
          } else if (line.trim() === '') {
            paragraphs.push(new Paragraph({ text: '' }));
          } else {
            const cleaned = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
            paragraphs.push(new Paragraph({ children: [new TextRun(cleaned)] }));
          }
        }
        const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[CanvasPanel] DOCX export failed:', err);
      }
      setShowDownloadMenu(false);
      return;
    }

    if (format === 'pdf') {
      // Render markdown to HTML, then use print-to-PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${title || 'Play'}</title>
          <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}
          h1,h2,h3{margin-top:1.5em}pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto}
          code{background:#f4f4f4;padding:2px 6px;border-radius:3px}blockquote{border-left:3px solid #ccc;margin-left:0;padding-left:16px;color:#666}
          table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}
          @media print{body{margin:0;padding:20px}}</style></head><body>`);
        // Simple markdown-to-HTML conversion for print
        const html = content
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>');
        printWindow.document.write(`<p>${html}</p></body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
      }
      setShowDownloadMenu(false);
      return;
    }

    if (format === 'html') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title || 'Play'}</title>
        <style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#333}
        h1,h2,h3{margin-top:1.5em}pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto}
        code{background:#f4f4f4;padding:2px 6px;border-radius:3px}</style></head><body>
        <h1>${title || 'Untitled'}</h1>${content
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')}</body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${safeName}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
      return;
    }

    const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${safeName}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const handleSaveArtifact = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const result = await createArtifact({
        message_id: canvasMessageId ?? undefined,
        type:       artifactType,
        title:      title || 'Untitled',
        content,
        viewAsUserId: viewAsUser?.id || undefined,
        client_profile_id: activeClientProfileId || undefined,
      });
      setCurrentArtifact(result.artifact || result);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Refresh browse list if it's been loaded
      if (browseList.length > 0) loadBrowseList(browseDebouncedSearch, browseActiveTag);
      // Trigger sidebar PlaybookList refresh
      triggerPlaybookRefresh();
    } catch (err) {
      console.error('[CanvasPanel] Failed to save artifact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTitleBlur = async () => {
    if (!currentArtifact?.id || !title.trim()) return;
    if (title === currentArtifact.title) return;
    try {
      const result = await updateArtifact(currentArtifact.id, { title: title.trim() });
      setCurrentArtifact({ ...currentArtifact, title: title.trim(), ...(result.artifact || {}) });
    } catch (err) {
      console.error('[CanvasPanel] Failed to update title:', err);
    }
  };

  const handleToggleStar = async () => {
    if (!currentArtifact || starring) return;
    try {
      setStarring(true);
      const updated = await toggleArtifactStar(currentArtifact.id);
      setCurrentArtifact({ ...currentArtifact, ...updated });
    } catch (err) {
      console.error('[CanvasPanel] Failed to toggle star:', err);
    } finally {
      setStarring(false);
    }
  };

  const handleAICleanup = async () => {
    if (!currentArtifact || cleaning) return;
    try {
      setCleaning(true);
      setCleanResult(null);
      const result = await cleanupArtifact(currentArtifact.id);
      if (result.trimmed) {
        setCanvasContent(result.content);
        setCurrentArtifact({ ...currentArtifact, content: result.content });
        setCleanResult('Cleaned up!');
        triggerPlaybookRefresh();
      } else {
        setCleanResult('Already clean');
      }
      setTimeout(() => setCleanResult(null), 3000);
    } catch (err) {
      console.error('[CanvasPanel] AI Cleanup failed:', err);
      setCleanResult('Failed');
      setTimeout(() => setCleanResult(null), 3000);
    } finally {
      setCleaning(false);
    }
  };

  const copyBrowseItem = async (e: React.MouseEvent, play: BrowseArtifact) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(play.content);
      setCopiedBrowseId(play.id);
      setTimeout(() => setCopiedBrowseId(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const openBrowseItem = (play: BrowseArtifact) => {
    setCurrentArtifact(play as any);
    setCanvasContent(play.content);
    setShowBrowser(false);
  };

  // ── Tag management handlers ─────────────────────────────────────────────
  const currentTags: string[] = currentArtifact?.metadata?.tags || [];

  const handleAddTag = async () => {
    const newTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, '');
    if (!newTag || !currentArtifact || currentTags.includes(newTag)) {
      setTagInput('');
      return;
    }
    const updatedTags = [...currentTags, newTag];
    setSavingTags(true);
    try {
      await updateArtifactTags(currentArtifact.id, updatedTags);
      setCurrentArtifact({
        ...currentArtifact,
        metadata: { ...(currentArtifact.metadata || {}), tags: updatedTags },
      });
      setTagInput('');
      triggerPlaybookRefresh();
    } catch (err) {
      console.error('[CanvasPanel] Failed to add tag:', err);
    } finally {
      setSavingTags(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!currentArtifact) return;
    const updatedTags = currentTags.filter(t => t !== tagToRemove);
    setSavingTags(true);
    try {
      await updateArtifactTags(currentArtifact.id, updatedTags);
      setCurrentArtifact({
        ...currentArtifact,
        metadata: { ...(currentArtifact.metadata || {}), tags: updatedTags },
      });
      triggerPlaybookRefresh();
    } catch (err) {
      console.error('[CanvasPanel] Failed to remove tag:', err);
    } finally {
      setSavingTags(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    {showSlideView && (
      <PlaybookSlideView
        content={content}
        title={title}
        onClose={() => setShowSlideView(false)}
      />
    )}
    <div
      className={`
        ${isFullWidth ? 'w-1/2' : 'w-[420px]'}
        h-full flex flex-col
        border-l border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        transition-all duration-200
        overflow-hidden
      `}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {showBrowser ? (
            <button
              onClick={() => setShowBrowser(false)}
              className="p-1 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Back to current play"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <FileText className="w-4 h-4 text-[#fcc824] shrink-0" />
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {showBrowser ? 'My Plays' : 'Playbook'}
          </span>
          {saved && !showBrowser && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!showBrowser && (
            <button
              onClick={() => setShowBrowser(true)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Browse all plays"
            >
              <List className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsFullWidth(prev => !prev)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={isFullWidth ? 'Collapse panel' : 'Expand panel'}
          >
            {isFullWidth
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />
            }
          </button>
          <button
            onClick={closeCanvas}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Close Playbook"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showBrowser ? (
        /* ── Browse All Plays View ────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto">
          {/* Browse search + tag filters */}
          <div className="px-4 pt-3 pb-2 space-y-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={browseSearch}
                onChange={e => setBrowseSearch(e.target.value)}
                placeholder="Search plays..."
                className="w-full text-xs pl-8 pr-8 py-2 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-[#fcc824] focus:ring-1 focus:ring-[#fcc824]/30 transition-colors"
              />
              {browseSearch && (
                <button
                  onClick={() => setBrowseSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {browseAllTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {browseAllTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setBrowseActiveTag(browseActiveTag === tag ? null : tag)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border transition-colors ${
                      browseActiveTag === tag
                        ? 'bg-[#fcc824] border-[#fcc824] text-black font-medium'
                        : 'bg-gray-100 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#fcc824]/50 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    {browseActiveTag === tag && <X className="w-2.5 h-2.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {browseLoading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading plays...</div>
          ) : browseList.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              {(browseDebouncedSearch || browseActiveTag) ? 'No plays match your filters.' : 'No plays saved yet.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {browseList.map(play => (
                <div key={play.id} className="group">
                  {/* Play row */}
                  <div
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === play.id ? null : play.id)}
                  >
                    <FileText className="w-4 h-4 text-[#fcc824] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {play.title || 'Untitled Play'}
                        </span>
                        {play.is_starred && (
                          <Star className="w-3 h-3 text-yellow-500 shrink-0" fill="currentColor" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded capitalize">
                          {play.type}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(play.created_at).toLocaleDateString()}
                        </span>
                        {(play as any).metadata?.tags?.map((t: string) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[#fcc824]/10 text-[#b8941a] dark:text-[#fcc824]/70 rounded-full border border-[#fcc824]/20">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => copyBrowseItem(e, play)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-[#fcc824] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Copy content"
                      >
                        {copiedBrowseId === play.id
                          ? <Check className="w-3.5 h-3.5 text-green-500" />
                          : <Copy className="w-3.5 h-3.5" />
                        }
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openBrowseItem(play); }}
                        className="px-2 py-1 text-[10px] font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
                        title="Open in Playbook"
                      >
                        Open
                      </button>
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {expandedId === play.id && (
                    <div className="px-4 pb-3">
                      <div className="ml-7 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                        <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words font-sans leading-relaxed">
                          {play.content.length > 2000
                            ? play.content.substring(0, 2000) + '\n\n...[click Open to see full content]'
                            : play.content
                          }
                        </pre>
                      </div>
                      <div className="ml-7 mt-2 flex gap-2">
                        <button
                          onClick={(e) => copyBrowseItem(e, play)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#fcc824] text-black hover:bg-[#f0be1e] transition-colors"
                        >
                          {copiedBrowseId === play.id
                            ? <><Check className="w-3 h-3" /> Copied!</>
                            : <><Copy className="w-3 h-3" /> Copy Content</>
                          }
                        </button>
                        <button
                          onClick={() => openBrowseItem(play)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FileText className="w-3 h-3" /> Open Play
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Normal Play View ─────────────────────────────────────────── */
        <>
          {/* ── Title + Type ───────────────────────────────────────────── */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2 shrink-0">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="
                w-full text-base font-bold
                text-gray-900 dark:text-white
                bg-transparent border-none outline-none
                placeholder-gray-400 dark:placeholder-gray-500
                hover:bg-gray-50 dark:hover:bg-gray-800/50
                focus:bg-gray-50 dark:focus:bg-gray-800/50
                rounded px-1 -mx-1 transition-colors
              "
              placeholder="Play title..."
            />
            <div className="flex items-center gap-2">
              <select
                value={artifactType}
                onChange={e => setArtifactType(e.target.value)}
                className="
                  text-xs px-2 py-1
                  bg-gray-100 dark:bg-gray-700
                  border border-gray-200 dark:border-gray-600
                  rounded-md
                  text-gray-700 dark:text-gray-300
                  focus:outline-none focus:ring-1 focus:ring-indigo-500
                  cursor-pointer
                "
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Star button for already-saved artifacts */}
              {currentArtifact && (
                <button
                  onClick={handleToggleStar}
                  disabled={starring}
                  className={`
                    p-1 rounded-md transition-colors disabled:opacity-50
                    ${currentArtifact.is_starred
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'
                    }
                  `}
                  title={currentArtifact.is_starred ? 'Unstar play' : 'Star play'}
                >
                  <Star
                    className="w-4 h-4"
                    fill={currentArtifact.is_starred ? 'currentColor' : 'none'}
                  />
                </button>
              )}
            </div>

            {/* Tag editor for saved artifacts */}
            {currentArtifact && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {currentTags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full bg-[#fcc824]/10 text-[#b8941a] dark:text-[#fcc824]/70 border border-[#fcc824]/20"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      disabled={savingTags}
                      className="ml-0.5 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remove tag"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
                {editingTags ? (
                  <div className="inline-flex items-center gap-1">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                        if (e.key === 'Escape') { setEditingTags(false); setTagInput(''); }
                      }}
                      onBlur={() => {
                        if (!tagInput.trim()) setEditingTags(false);
                      }}
                      placeholder="tag name"
                      className="w-20 text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-[#fcc824]"
                      autoFocus
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || savingTags}
                      className="p-0.5 text-[#fcc824] hover:text-[#f0be1e] disabled:opacity-30 transition-colors"
                      title="Add tag"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingTags(true); setTimeout(() => tagInputRef.current?.focus(), 50); }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-[#fcc824] hover:text-[#fcc824] transition-colors"
                    title="Add tag"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    tag
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Toolbar ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="
                flex items-center gap-1.5 px-3 py-1.5
                text-xs font-medium
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                rounded-md transition-colors
              "
            >
              {copied
                ? <Check className="w-3.5 h-3.5 text-green-500" />
                : <Copy  className="w-3.5 h-3.5" />
              }
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {/* AI Cleanup — only for saved artifacts */}
            {currentArtifact && (
              <button
                onClick={handleAICleanup}
                disabled={cleaning}
                className="
                  flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-medium
                  text-purple-600 dark:text-purple-400
                  hover:bg-purple-50 dark:hover:bg-purple-900/20
                  rounded-md transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                title="Use AI to trim conversational intro/outro from the play"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {cleaning ? 'Cleaning…' : cleanResult || 'AI Cleanup'}
              </button>
            )}

            {/* Present as slides (only if content has --- delimiters) */}
            {content.split('\n---\n').length >= 2 && (
              <button
                onClick={() => setShowSlideView(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-colors"
                title="Present as slides"
              >
                <Presentation className="w-3.5 h-3.5" />
                Present
              </button>
            )}

            {/* Download dropdown */}
            <div className="relative" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="
                  flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-medium
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  rounded-md transition-colors
                "
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
              {showDownloadMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 min-w-[140px]">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-md"
                  >
                    PDF (Print)
                  </button>
                  <button
                    onClick={() => handleDownload('docx')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Word Doc (.docx)
                  </button>
                  <button
                    onClick={() => handleDownload('html')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    HTML (.html)
                  </button>
                  <button
                    onClick={() => handleDownload('md')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                  >
                    Text (.txt)
                  </button>
                </div>
              )}
            </div>

            {/* Save (only shown when not yet saved as an artifact) */}
            {!currentArtifact && (
              <button
                onClick={handleSaveArtifact}
                disabled={saving || !content}
                className="
                  flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-medium text-black
                  bg-[#fcc824] hover:bg-[#f0be1e]
                  rounded-md transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <Star className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save Play'}
              </button>
            )}

            {/* Version badge for saved artifacts */}
            {currentArtifact && (
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                v{currentArtifact.version} · Saved
              </span>
            )}
          </div>

          {/* ── Content Area ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {content ? (
              <div
                className="
                  prose prose-sm dark:prose-invert max-w-none

                  prose-headings:font-semibold
                  prose-headings:text-gray-900 dark:prose-headings:text-white
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base

                  prose-p:text-gray-700 dark:prose-p:text-gray-300
                  prose-p:leading-relaxed

                  prose-strong:text-gray-900 dark:prose-strong:text-white

                  prose-li:text-gray-700 dark:prose-li:text-gray-300

                  prose-a:text-indigo-600 dark:prose-a:text-indigo-400
                  prose-a:no-underline hover:prose-a:underline

                  prose-code:text-indigo-600 dark:prose-code:text-indigo-400
                  prose-code:bg-indigo-50 dark:prose-code:bg-indigo-900/30
                  prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                  prose-code:before:content-none prose-code:after:content-none

                  prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
                  prose-pre:rounded-lg prose-pre:overflow-x-auto

                  prose-blockquote:border-l-indigo-400 dark:prose-blockquote:border-l-indigo-600
                  prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400

                  prose-hr:border-gray-200 dark:prose-hr:border-gray-700

                  prose-table:text-sm
                  prose-th:bg-gray-100 dark:prose-th:bg-gray-700
                  prose-th:px-3 prose-th:py-2 prose-th:font-semibold
                  prose-td:px-3 prose-td:py-2
                  prose-td:border-gray-200 dark:prose-td:border-gray-700
                "
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No content yet. Ask an agent to generate a play &mdash;<br />
                  a document, framework, or script &mdash; and it&apos;ll appear here.
                </p>
                <button
                  onClick={() => setShowBrowser(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <List className="w-4 h-4" />
                  Browse My Plays
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
