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
  Tag,
  ChevronRight,
  ChevronDown,
  File
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

export default function AssetsPanel({
  conversationId,
  agentId,
  isOpen,
  onClose
}: AssetsPanelProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Load assets
  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen, conversationId, agentId, showArchived]);

  // Filter assets based on search and filters
  useEffect(() => {
    let filtered = assets;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.asset_type === selectedType);
    }

    // Filter by search query
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
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNote = async () => {
    if (!noteTitle.trim()) return;

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
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const updateNote = async () => {
    if (!editingNote) return;

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
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadAssets();
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
    }
  };

  const togglePin = async (asset: Asset) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_pinned: !asset.is_pinned })
      });
      loadAssets();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const toggleArchive = async (asset: Asset) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_archived: !asset.is_archived })
      });
      loadAssets();
    } catch (error) {
      console.error('Failed to toggle archive:', error);
    }
  };

  const downloadFile = async (asset: Asset) => {
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
      }
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversation_id', conversationId);
    if (agentId) formData.append('agent_id', agentId);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/assets/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        loadAssets();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
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
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes & Files</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes and files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => openNoteEditor()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-sm">
            <Upload className="w-4 h-4" />
            Upload
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Types</option>
            <option value="note">Notes</option>
            <option value="file">Files</option>
            <option value="suggested_note">Suggested</option>
            <option value="memory_snapshot">Memories</option>
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 border rounded-lg text-sm ${
              showArchived
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No assets found</p>
          </div>
        ) : (
          Object.entries(groupedAssets).map(([type, typeAssets]) => (
            <div key={type} className="space-y-2">
              <button
                onClick={() => toggleCategory(type)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 w-full hover:text-gray-900 dark:hover:text-white"
              >
                {expandedCategories.has(type) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')} ({typeAssets.length})
              </button>

              {expandedCategories.has(type) && (
                <div className="space-y-2 ml-6">
                  {typeAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {asset.asset_type === 'file' ? (
                              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {asset.title || asset.file_name || 'Untitled'}
                            </h3>
                            {asset.is_pinned && (
                              <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          {asset.content && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {asset.content}
                            </p>
                          )}
                          {asset.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {asset.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => togglePin(asset)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Pin/Unpin"
                        >
                          <Pin className={`w-3.5 h-3.5 ${asset.is_pinned ? 'text-yellow-500' : 'text-gray-400'}`} />
                        </button>

                        {asset.asset_type === 'note' && (
                          <button
                            onClick={() => openNoteEditor(asset)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs"
                            title="Edit"
                          >
                            Edit
                          </button>
                        )}

                        {asset.asset_type === 'file' && (
                          <button
                            onClick={() => downloadFile(asset)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}

                        <button
                          onClick={() => toggleArchive(asset)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Archive/Unarchive"
                        >
                          <Archive className={`w-3.5 h-3.5 ${asset.is_archived ? 'text-orange-500' : 'text-gray-400'}`} />
                        </button>

                        <button
                          onClick={() => deleteAsset(asset.id)}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded ml-auto"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-10 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {editingNote ? 'Edit Note' : 'New Note'}
            </h3>
            <button onClick={resetNoteEditor} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <input
              type="text"
              placeholder="Note title..."
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />

            <textarea
              placeholder="Note content..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none"
            />

            <input
              type="text"
              placeholder="Tags (comma-separated)..."
              value={noteTags.join(', ')}
              onChange={(e) => setNoteTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button
              onClick={resetNoteEditor}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={editingNote ? updateNote : createNote}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingNote ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
