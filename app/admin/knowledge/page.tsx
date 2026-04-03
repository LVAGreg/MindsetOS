'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  Sparkles,
  Globe,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react';

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  agent_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  file_name?: string;
  file_size?: number;
  embedding?: number[];
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const currentUser = useAppStore((state) => state.user);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<KnowledgeDocument | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'transcript',
    tags: '',
    agent_id: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'admin' && currentUser.role !== 'power_user') {
      router.push('/dashboard');
    } else {
      loadData();
    }
  }, [currentUser, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      const docsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/knowledge-base`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(Array.isArray(docsData.documents) ? docsData.documents : []);
      } else {
        setError('Failed to load documents');
      }

      const agentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/letta/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(Array.isArray(agentsData) ? agentsData : []);
      } else {
        setError('Failed to load agents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);
      setUploadStatus('🚀 Starting upload...');

      const token = localStorage.getItem('accessToken');

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('category', uploadForm.category);
      formData.append('tags', uploadForm.tags);
      if (uploadForm.title) formData.append('title', uploadForm.title);
      if (uploadForm.agent_id) formData.append('agent_id', uploadForm.agent_id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/knowledge-base/upload-stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response stream');

      let resultData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            if (data.step === 'error') throw new Error(data.error);
            setUploadProgress(data.progress || 0);
            setUploadStatus(data.message || '');
            if (data.chunks) setUploadStatus(`${data.message} (${data.chunks} chunks)`);
            if (data.current && data.total) setUploadStatus(`${data.message} ${data.current}/${data.total}`);
            if (data.step === 'complete') {
              resultData = data.result;
              setUploadStatus('✅ Upload complete!');
              setUploadProgress(100);
            }
          }
        }
      }

      setSuccess(`Successfully uploaded: ${resultData?.title || 'Document'}`);

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadForm({ title: '', category: 'transcript', tags: '', agent_id: '', file: null });
        setUploadStatus('');
        setUploadProgress(0);
        loadData();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (doc: KnowledgeDocument) => {
    setEditingDocument(doc);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/knowledge-base/${editingDocument.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editingDocument.title,
          content: editingDocument.content,
          category: editingDocument.category,
          tags: editingDocument.tags,
          agent_id: editingDocument.agent_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setSuccess('Document updated successfully');
      setShowEditModal(false);
      setEditingDocument(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete');

      setSuccess('Document deleted successfully');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const filteredDocuments = Array.isArray(documents) ? documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAgent =
      filterAgent === 'all' ||
      (filterAgent === 'global' && !doc.agent_id) ||
      doc.agent_id === filterAgent;
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesAgent && matchesCategory;
  }) : [];

  const categories = Array.isArray(documents) ? Array.from(new Set(documents.map((d) => d.category))) : [];
  const globalDocs = Array.isArray(documents) ? documents.filter((d) => !d.agent_id).length : 0;
  const agentDocs = Array.isArray(documents) ? documents.filter((d) => d.agent_id).length : 0;

  const inputClass = "w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]";
  const labelClass = "block text-sm font-medium mb-2" ;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ background: '#09090f' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4f6ef7' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: '#09090f' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>Knowledge Base</h1>
          <p className="mt-1" style={{ color: '#9090a8' }}>
            Manage system-wide and agent-specific knowledge documents
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1">
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
          </div>
          <button onClick={() => setError(null)} style={{ color: '#f87171' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
          <div className="flex-1">
            <p className="text-sm" style={{ color: '#86efac' }}>{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} style={{ color: '#4ade80' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Database className="w-6 h-6" style={{ color: '#7b8ff8' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Documents</p>
              <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{documents.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Globe className="w-6 h-6" style={{ color: '#7b8ff8' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Global Knowledge</p>
              <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{globalDocs}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(79,110,247,0.12)' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#7b8ff8' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Agent-Specific</p>
              <p className="text-2xl font-bold" style={{ color: '#ededf5' }}>{agentDocs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9090a8' }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
            />
          </div>

          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Agents</option>
            <option value="global">Global Knowledge</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'rgba(9,9,15,0.5)', borderBottom: '1px solid #1e1e30' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>Scope</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: '#9090a8' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center" style={{ color: '#9090a8' }}>
                    No documents found. Upload your first document to get started!
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid #1e1e30' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.04)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#9090a8' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#ededf5' }}>{doc.title}</p>
                          <p className="text-sm line-clamp-1" style={{ color: '#9090a8' }}>
                            {doc.content.substring(0, 100)}...
                          </p>
                          {Array.isArray(doc.tags) && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {doc.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.25)', color: '#7b8ff8', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.agent_id ? (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" style={{ color: '#7b8ff8' }} />
                          <span className="text-sm" style={{ color: '#ededf5' }}>
                            {agents.find((a) => a.id === doc.agent_id)?.name || 'Agent'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" style={{ color: '#7b8ff8' }} />
                          <span className="text-sm" style={{ color: '#ededf5' }}>Global</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#9090a8' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(doc)}
                          className="p-2 rounded-xl transition-colors"
                          style={{ color: '#7b8ff8' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(79,110,247,0.12)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                          title="Edit document"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 rounded-xl transition-colors"
                          style={{ color: '#f87171' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 rounded-xl transition-colors"
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <X className="w-5 h-5" style={{ color: '#9090a8' }} />
                </button>
              </div>
            </div>

            <form onSubmit={handleFileUpload} className="p-6 space-y-4">
              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Document File</label>
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.docx,.doc"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className={inputClass}
                  required
                />
                <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                  Supported: TXT, MD, PDF, DOCX (Max 10MB)
                </p>
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Title (optional)</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Auto-generated from filename if empty"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className={inputClass}
                >
                  <option value="transcript">Call Transcript</option>
                  <option value="training">Training Material</option>
                  <option value="documentation">Documentation</option>
                  <option value="policy">Policy/Guidelines</option>
                  <option value="faq">FAQ</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Scope</label>
                <select
                  value={uploadForm.agent_id}
                  onChange={(e) => setUploadForm({ ...uploadForm, agent_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Global (All Agents)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name} (Agent-Specific)</option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                  Global knowledge is accessible to all agents. Agent-specific knowledge is only for that agent.
                </p>
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Tags (optional)</label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  placeholder="comma, separated, tags"
                  className={inputClass}
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: '#ededf5' }}>{uploadStatus}</span>
                    <span style={{ color: '#9090a8' }}>{uploadProgress}%</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: '#1e1e30' }}>
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, background: '#4f6ef7' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ border: '1px solid #1e1e30', color: '#9090a8', background: 'transparent' }}
                  onMouseEnter={(e) => !uploading && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDocument && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl" style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid #1e1e30' }}>
            <div className="p-6" style={{ borderBottom: '1px solid #1e1e30' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ color: '#ededf5' }}>Edit Document</h2>
                <button
                  onClick={() => { setShowEditModal(false); setEditingDocument(null); }}
                  className="p-2 rounded-xl transition-colors"
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <X className="w-5 h-5" style={{ color: '#9090a8' }} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Title</label>
                <input
                  type="text"
                  value={editingDocument.title}
                  onChange={(e) => setEditingDocument({ ...editingDocument, title: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Content</label>
                <textarea
                  value={editingDocument.content}
                  onChange={(e) => setEditingDocument({ ...editingDocument, content: e.target.value })}
                  rows={10}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                />
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Category</label>
                <select
                  value={editingDocument.category}
                  onChange={(e) => setEditingDocument({ ...editingDocument, category: e.target.value })}
                  className={inputClass}
                >
                  <option value="transcript">Call Transcript</option>
                  <option value="training">Training Material</option>
                  <option value="documentation">Documentation</option>
                  <option value="policy">Policy/Guidelines</option>
                  <option value="faq">FAQ</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Scope</label>
                <select
                  value={editingDocument.agent_id || ''}
                  onChange={(e) => setEditingDocument({ ...editingDocument, agent_id: e.target.value || null })}
                  className={inputClass}
                >
                  <option value="">Global (All Agents)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name} (Agent-Specific)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} style={{ color: '#9090a8' }}>Tags</label>
                <input
                  type="text"
                  value={editingDocument.tags?.join(', ') || ''}
                  onChange={(e) => setEditingDocument({
                    ...editingDocument,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  })}
                  placeholder="comma, separated, tags"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingDocument(null); }}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
                  style={{ border: '1px solid #1e1e30', color: '#9090a8', background: 'transparent' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
