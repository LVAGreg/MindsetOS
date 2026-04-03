'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Pin,
  Archive,
  Trash2,
  Search,
  Plus,
  X,
  Download,
  ChevronRight,
  ChevronDown,
  File,
  Loader2
} from 'lucide-react';

interface Asset {
  id: string;
  asset_type: 'note' | 'file' | 'suggested_note' | 'memory_snapshot';
  title: string;
  content?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  file_type?: string;
  tags: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  conversation_id?: string;
  agent_id?: string;
}

interface AssetsPanelProps {
  conversationId?: string;
  agentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── design tokens ──────────────────────────────────────────────
const T = {
  pageBg:   '#09090f',
  cardBg:   'rgba(18,18,31,0.8)',
  border:   '#1e1e30',
  textPrimary: '#ededf5',
  textMuted:   '#9090a8',
  textDim:     '#5a5a72',
  blue:     '#4f6ef7',
  amber:    '#fcc824',
  purple:   '#7c5bf6',
  red:      '#ef4444',
  inputBg:  'rgba(18,18,31,0.9)',
};

export default function AssetsPanel({
  conversationId,
  agentId,
  isOpen,
  onClose
}: AssetsPanelProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['notes']));

  // Note editor state
  const [editingNote, setEditingNote] = useState<Asset | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Load assets
  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen, conversationId, agentId, showArchived]);

  // Filter assets based on search and filters
  useEffect(() => {
    let filtered = assets;

    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.asset_type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(query) ||
        a.content?.toLowerCase().includes(query) ||
        a.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredAssets(filtered);
  }, [assets, selectedType, searchQuery]);

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (conversationId) params.append('conversation_id', conversationId);
      if (agentId) params.append('agent_id', agentId);
      if (showArchived) params.append('archived', 'true');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      } else {
        setError('Failed to load assets.');
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          asset_type: 'note',
          title: noteTitle,
          content: noteContent,
          tags: noteTags,
          conversation_id: conversationId,
          agent_id: agentId
        })
      });

      if (response.ok) {
        resetNoteEditor();
        loadAssets();
      } else {
        setError('Failed to create note.');
      }
    } catch (err) {
      console.error('Failed to create note:', err);
      setError('Failed to create note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const updateNote = async () => {
    if (!editingNote) return;
    setSavingNote(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${editingNote.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          tags: noteTags
        })
      });

      if (response.ok) {
        resetNoteEditor();
        loadAssets();
      } else {
        setError('Failed to update note.');
      }
    } catch (err) {
      console.error('Failed to update note:', err);
      setError('Failed to update note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadAssets();
      } else {
        setError('Failed to delete asset.');
      }
    } catch (err) {
      console.error('Failed to delete asset:', err);
      setError('Failed to delete asset. Please try again.');
    }
  };

  const togglePin = async (asset: Asset) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: !asset.is_pinned })
      });
      if (response.ok) {
        loadAssets();
      } else {
        setError('Failed to update pin.');
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
      setError('Failed to update pin. Please try again.');
    }
  };

  const toggleArchive = async (asset: Asset) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_archived: !asset.is_archived })
      });
      if (response.ok) {
        loadAssets();
      } else {
        setError('Failed to update archive status.');
      }
    } catch (err) {
      console.error('Failed to toggle archive:', err);
      setError('Failed to update archive status. Please try again.');
    }
  };

  const downloadFile = async (asset: Asset) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${asset.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.file_name || 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download file.');
      }
    } catch (err) {
      console.error('Failed to download file:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversation_id', conversationId);
    if (agentId) formData.append('agent_id', agentId);

    setUploadingFile(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        loadAssets();
      } else {
        setError('Failed to upload file.');
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
      // reset input so same file can be re-uploaded
      event.target.value = '';
    }
  };

  const openNoteEditor = (asset?: Asset) => {
    if (asset) {
      setEditingNote(asset);
      setNoteTitle(asset.title);
      setNoteContent(asset.content || '');
      setNoteTags(asset.tags || []);
    }
    setShowNoteEditor(true);
  };

  const resetNoteEditor = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setShowNoteEditor(false);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group assets by type
  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    const type = asset.asset_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  // Sort: pinned first
  Object.keys(groupedAssets).forEach(type => {
    groupedAssets[type].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', right: 0, top: 0, height: '100%', width: '24rem',
        background: T.cardBg, borderLeft: `1px solid ${T.border}`,
        zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: T.textPrimary, margin: 0 }}>
          Notes &amp; Files
        </h2>
        <button
          onClick={onClose}
          aria-label="Close assets panel"
          style={{
            padding: '0.5rem', borderRadius: '0.5rem', background: 'transparent',
            border: 'none', cursor: 'pointer', color: T.textMuted,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            margin: '0.75rem 1rem 0',
            padding: '0.5rem 0.75rem',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '0.5rem',
            color: '#fca5a5',
            fontSize: '0.8125rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', flexShrink: 0 }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div
        style={{
          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            className="w-4 h-4"
            style={{
              position: 'absolute', left: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', color: T.textDim,
            }}
          />
          <input
            type="text"
            placeholder="Search notes and files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
              paddingTop: '0.5rem', paddingBottom: '0.5rem',
              border: `1px solid ${T.border}`, borderRadius: '0.5rem',
              background: T.inputBg, color: T.textPrimary, fontSize: '0.875rem',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Action buttons — flex-wrap for mobile */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => openNoteEditor()}
            style={{
              flex: '1 1 auto', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: T.blue, color: '#fff',
              border: 'none', borderRadius: '0.5rem',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
            }}
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
          <label
            style={{
              flex: '1 1 auto', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              background: uploadingFile ? T.textDim : T.purple, color: '#fff',
              border: 'none', borderRadius: '0.5rem',
              cursor: uploadingFile ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 500,
              opacity: uploadingFile ? 0.7 : 1,
            }}
          >
            {uploadingFile ? (
              <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploadingFile ? 'Uploading…' : 'Upload'}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Type filter + archive toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              flex: '1 1 auto', padding: '0.5rem 0.75rem',
              border: `1px solid ${T.border}`, borderRadius: '0.5rem',
              background: T.inputBg, color: T.textPrimary, fontSize: '0.875rem',
              outline: 'none',
            }}
          >
            <option value="all">All Types</option>
            <option value="note">Notes</option>
            <option value="file">Files</option>
            <option value="suggested_note">Suggested</option>
            <option value="memory_snapshot">Memories</option>
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            aria-label={showArchived ? 'Hide archived' : 'Show archived'}
            style={{
              padding: '0.5rem 0.75rem',
              border: `1px solid ${T.border}`, borderRadius: '0.5rem',
              background: showArchived ? 'rgba(124,91,246,0.2)' : 'transparent',
              color: showArchived ? T.purple : T.textMuted,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assets List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: T.textMuted, paddingTop: '2rem', paddingBottom: '2rem' }}>
            Loading...
          </div>
        ) : filteredAssets.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.textMuted, paddingTop: '2rem', paddingBottom: '2rem' }}>
            <FileText className="w-12 h-12 mx-auto mb-2" style={{ opacity: 0.4, color: T.textDim }} />
            <p style={{ margin: 0 }}>No assets found</p>
          </div>
        ) : (
          Object.entries(groupedAssets).map(([type, typeAssets]) => (
            <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => toggleCategory(type)}
                aria-label={`Toggle ${type} category`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.875rem', fontWeight: 500, color: T.textMuted,
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, textAlign: 'left',
                }}
              >
                {expandedCategories.has(type) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} ({typeAssets.length})
              </button>

              {expandedCategories.has(type) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '1.5rem' }}>
                  {typeAssets.map(asset => (
                    <div
                      key={asset.id}
                      style={{
                        padding: '0.75rem',
                        border: `1px solid ${T.border}`,
                        borderRadius: '0.5rem',
                        background: T.cardBg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {asset.asset_type === 'file' ? (
                              <File className="w-4 h-4" style={{ color: T.textDim, flexShrink: 0 }} />
                            ) : (
                              <FileText className="w-4 h-4" style={{ color: T.textDim, flexShrink: 0 }} />
                            )}
                            <h3
                              style={{
                                fontSize: '0.875rem', fontWeight: 500, color: T.textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
                              }}
                            >
                              {asset.title || asset.file_name || 'Untitled'}
                            </h3>
                            {asset.is_pinned && (
                              <Pin className="w-3 h-3" style={{ color: T.amber, flexShrink: 0 }} />
                            )}
                          </div>
                          {asset.content && (
                            <p
                              style={{
                                fontSize: '0.75rem', color: T.textMuted, marginTop: '0.25rem',
                                overflow: 'hidden', display: '-webkit-box',
                                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {asset.content}
                            </p>
                          )}
                          {asset.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                              {asset.tags.map(tag => (
                                <span
                                  key={tag}
                                  style={{
                                    fontSize: '0.75rem', padding: '0.125rem 0.5rem',
                                    background: 'rgba(124,91,246,0.15)',
                                    color: T.purple, borderRadius: '0.25rem',
                                    border: `1px solid rgba(124,91,246,0.25)`,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => togglePin(asset)}
                          aria-label={asset.is_pinned ? 'Unpin asset' : 'Pin asset'}
                          style={{
                            padding: '0.375rem', borderRadius: '0.25rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: asset.is_pinned ? T.amber : T.textDim,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {asset.asset_type === 'note' && (
                          <button
                            onClick={() => openNoteEditor(asset)}
                            aria-label="Edit note"
                            style={{
                              padding: '0.375rem 0.5rem', borderRadius: '0.25rem',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: T.textMuted, fontSize: '0.75rem',
                            }}
                          >
                            Edit
                          </button>
                        )}

                        {asset.asset_type === 'file' && (
                          <button
                            onClick={() => downloadFile(asset)}
                            aria-label="Download file"
                            style={{
                              padding: '0.375rem', borderRadius: '0.25rem',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: T.textDim,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => toggleArchive(asset)}
                          aria-label={asset.is_archived ? 'Unarchive asset' : 'Archive asset'}
                          style={{
                            padding: '0.375rem', borderRadius: '0.25rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: asset.is_archived ? T.amber : T.textDim,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteAsset(asset.id)}
                          aria-label="Delete asset"
                          style={{
                            padding: '0.375rem', borderRadius: '0.25rem',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: T.red, marginLeft: 'auto',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Note Editor Modal */}
      {showNoteEditor && (
        <div
          style={{
            position: 'absolute', inset: 0,
            background: T.pageBg,
            zIndex: 10, display: 'flex', flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '1rem', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: T.textPrimary, margin: 0 }}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </h3>
            <button
              onClick={resetNoteEditor}
              aria-label="Close note editor"
              style={{
                padding: '0.5rem', borderRadius: '0.5rem', background: 'transparent',
                border: 'none', cursor: 'pointer', color: T.textMuted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error banner inside editor */}
          {error && (
            <div
              style={{
                margin: '0.75rem 1rem 0',
                padding: '0.5rem 0.75rem',
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.35)',
                borderRadius: '0.5rem',
                color: '#fca5a5',
                fontSize: '0.8125rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                aria-label="Dismiss error"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', flexShrink: 0 }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Note title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 1rem',
                border: `1px solid ${T.border}`, borderRadius: '0.5rem',
                background: T.inputBg, color: T.textPrimary, fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />

            <textarea
              placeholder="Note content..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={10}
              style={{
                width: '100%', padding: '0.5rem 1rem',
                border: `1px solid ${T.border}`, borderRadius: '0.5rem',
                background: T.inputBg, color: T.textPrimary, fontSize: '0.875rem',
                outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />

            <input
              type="text"
              placeholder="Tags (comma-separated)..."
              value={noteTags.join(', ')}
              onChange={(e) => setNoteTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              style={{
                width: '100%', padding: '0.5rem 1rem',
                border: `1px solid ${T.border}`, borderRadius: '0.5rem',
                background: T.inputBg, color: T.textPrimary, fontSize: '0.875rem',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            style={{
              padding: '1rem', borderTop: `1px solid ${T.border}`,
              display: 'flex', gap: '0.5rem', flexWrap: 'wrap',
            }}
          >
            <button
              onClick={resetNoteEditor}
              disabled={savingNote}
              style={{
                flex: '1 1 auto', padding: '0.5rem 1rem',
                border: `1px solid ${T.border}`, borderRadius: '0.5rem',
                background: 'transparent', color: T.textMuted,
                cursor: savingNote ? 'not-allowed' : 'pointer',
                opacity: savingNote ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={editingNote ? updateNote : createNote}
              disabled={savingNote || !noteTitle.trim()}
              style={{
                flex: '1 1 auto', padding: '0.5rem 1rem',
                background: savingNote || !noteTitle.trim() ? T.textDim : T.blue,
                color: '#fff', border: 'none', borderRadius: '0.5rem',
                cursor: savingNote || !noteTitle.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontWeight: 500,
              }}
            >
              {savingNote && (
                <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} />
              )}
              {savingNote ? 'Saving…' : editingNote ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
