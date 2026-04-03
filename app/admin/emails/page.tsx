'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail,
  Check,
  X,
  RefreshCw,
  Edit,
  Save,
  Clock,
  Send,
  AlertCircle,
  Eye,
  Code,
  FileText,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// Dynamically import React Quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="h-full rounded-lg animate-pulse" style={{ background: 'rgba(18,18,31,0.7)' }} />
});

import 'react-quill-new/dist/quill.snow.css';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  enabled: boolean;
  category: string;
  trigger_event: string;
  delay_minutes: number;
  priority: number;
  html_template?: string;
  available_variables?: string[];
  created_at: string;
  updated_at: string;
}

export default function AdminEmailsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    subject: '',
    html_template: '',
  });
  const [editorMode, setEditorMode] = useState<'content' | 'html'>('content');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Quill editor modules
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align', 'link', 'image'
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Auto-dismiss status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getEmailTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch email templates:', error);
      setStatusMessage({ type: 'error', text: 'Failed to load email templates' });
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (template: EmailTemplate) => {
    try {
      setSaving(template.id);
      await apiClient.updateEmailTemplate(template.id, { enabled: !template.enabled });
      setTemplates(templates.map(t =>
        t.id === template.id ? { ...t, enabled: !t.enabled } : t
      ));
    } catch (error) {
      console.error('Failed to update template:', error);
      setStatusMessage({ type: 'error', text: 'Failed to update email template' });
    } finally {
      setSaving(null);
    }
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      html_template: template.html_template || '',
    });
    setEditorMode('content');
  };

  const closeEditModal = () => {
    setEditingTemplate(null);
    setEditForm({ name: '', description: '', subject: '', html_template: '' });
    setEditorMode('content');
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      setSaving(editingTemplate.id);
      await apiClient.updateEmailTemplate(editingTemplate.id, {
        name: editForm.name,
        description: editForm.description,
        subject: editForm.subject,
        html_template: editForm.html_template,
      });
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id ? {
          ...t,
          name: editForm.name,
          description: editForm.description,
          subject: editForm.subject,
          html_template: editForm.html_template,
        } : t
      ));
      setStatusMessage({ type: 'success', text: 'Template saved successfully' });
      closeEditModal();
    } catch (error) {
      console.error('Failed to save template:', error);
      setStatusMessage({ type: 'error', text: 'Failed to save email template' });
    } finally {
      setSaving(null);
    }
  };

  const insertVariable = (variable: string) => {
    if (editorMode === 'html') {
      const textarea = document.getElementById('html-editor') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editForm.html_template;
        const insertion = `{{${variable}}}`;
        const newText = text.substring(0, start) + insertion + text.substring(end);
        setEditForm({ ...editForm, html_template: newText });
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + insertion.length, start + insertion.length);
        }, 0);
      }
    } else {
      // For content mode, append to end
      setEditForm({ ...editForm, html_template: editForm.html_template + `{{${variable}}}` });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'transactional': return 'text-[#60a5fa]';
      case 'onboarding': return 'text-[#4ade80]';
      case 'marketing': return 'text-[#c084fc]';
      case 'milestone': return 'text-[#fb923c]';
      case 'engagement': return 'text-[#f472b6]';
      default: return 'text-[#9090a8]';
    }
  };

  const enabledCount = templates.filter(t => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {statusMessage && (
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm"
          style={statusMessage.type === 'error'
            ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }
            : { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="p-1 rounded"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(144,144,168,0.15)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Email Templates</h1>
          <p className="mt-1" style={{ color: '#9090a8' }}>
            Manage automated email notifications
          </p>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
          style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', color: '#9090a8' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(79,110,247,0.15)' }}>
              <Mail className="w-5 h-5" style={{ color: '#4f6ef7' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Total Templates</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{templates.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <Check className="w-5 h-5" style={{ color: '#4ade80' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Enabled</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{enabledCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(144,144,168,0.15)' }}>
              <X className="w-5 h-5" style={{ color: '#9090a8' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#9090a8' }}>Disabled</p>
              <p className="text-xl font-bold" style={{ color: '#ededf5' }}>{templates.length - enabledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="rounded-xl" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30', borderRadius: 16 }}>
        <div className="p-4" style={{ borderBottom: '1px solid #1e1e30' }}>
          <h2 className="font-semibold" style={{ color: '#ededf5' }}>All Email Templates</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#4f6ef7' }} />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: '#9090a8' }}>
            <Mail className="w-12 h-12 mb-3 opacity-30" />
            <p>No email templates found</p>
          </div>
        ) : (
          <div>
            {templates.map((template) => (
              <div key={template.id} className="p-4 m-3 rounded-xl" style={{ background: 'rgba(18,18,31,0.5)', border: '1px solid #1e1e30', borderRadius: 12 }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium" style={{ color: '#ededf5' }}>
                        {template.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(template.category)}`}
                        style={{ background: 'rgba(144,144,168,0.1)', border: '1px solid rgba(144,144,168,0.2)' }}>
                        {template.category}
                      </span>
                    </div>

                    <p className="text-sm mb-2" style={{ color: '#9090a8' }}>
                      {template.description}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs uppercase font-medium" style={{ color: '#9090a8' }}>Subject:</span>
                      <span className="text-sm" style={{ color: '#ededf5' }}>{template.subject}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs" style={{ color: '#9090a8' }}>
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        Trigger: {template.trigger_event || 'manual'}
                      </span>
                      {template.delay_minutes > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Delay: {template.delay_minutes}m
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: '#9090a8' }}
                      title="Edit template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-medium" style={{ color: template.enabled ? '#4ade80' : '#9090a8' }}>
                      {template.enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                      onClick={() => toggleEnabled(template)}
                      disabled={saving === template.id}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40"
                      style={{ background: template.enabled ? '#4ade80' : '#1e1e30' }}
                    >
                      {saving === template.id ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="w-3 h-3 animate-spin" style={{ color: '#ededf5' }} />
                        </span>
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${
                            template.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                          style={{ background: '#ededf5' }}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(252,200,36,0.1)', border: '1px solid rgba(252,200,36,0.25)' }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#fcc824' }} />
        <div className="text-sm" style={{ color: '#fcc824' }}>
          <p className="font-medium mb-1">Email Template Notes</p>
          <ul className="list-disc list-inside space-y-1" style={{ color: '#fcc824', opacity: 0.85 }}>
            <li>Disabled templates will not be sent even when triggered</li>
            <li>Verification and Password Reset emails should remain enabled for security</li>
            <li>Use variables like {'{{userName}}'} in templates for personalization</li>
            <li>Changes take effect immediately</li>
          </ul>
        </div>
      </div>

      {/* Fullscreen Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#09090f' }}>
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3" style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <h2 className="text-base md:text-lg font-semibold truncate" style={{ color: '#ededf5' }}>Edit: {editForm.name}</h2>
              <span className="text-sm hidden sm:inline" style={{ color: '#9090a8' }}>({editingTemplate.id})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveTemplate}
                disabled={saving === editingTemplate.id}
                className="font-semibold rounded-xl px-5 py-2.5 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                style={{ background: '#4f6ef7', color: '#ededf5' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#3d5ce0'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#4f6ef7'; }}
              >
                {saving === editingTemplate.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={closeEditModal}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#9090a8' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(144,144,168,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top Bar: Metadata */}
          <div className="px-6 py-3" style={{ background: 'rgba(18,18,31,0.7)', borderBottom: '1px solid #1e1e30' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#9090a8' }}>Subject Line</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                />
              </div>
            </div>
          </div>

          {/* Main Content: Split View */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel: Editor */}
            <div className="w-full md:w-1/2 flex flex-col" style={{ borderRight: '1px solid #1e1e30', background: 'rgba(18,18,31,0.7)' }}>
              {/* Editor Toggle & Variables */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2" style={{ borderBottom: '1px solid #1e1e30', background: 'rgba(9,9,15,0.5)' }}>
                <div className="flex items-center rounded-lg p-0.5" style={{ background: '#1e1e30' }}>
                  <button
                    onClick={() => setEditorMode('content')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors`}
                    style={editorMode === 'content'
                      ? { background: 'rgba(79,110,247,0.2)', color: '#ededf5' }
                      : { color: '#9090a8' }}
                  >
                    <FileText className="w-4 h-4" />
                    Content
                  </button>
                  <button
                    onClick={() => setEditorMode('html')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors`}
                    style={editorMode === 'html'
                      ? { background: 'rgba(79,110,247,0.2)', color: '#ededf5' }
                      : { color: '#9090a8' }}
                  >
                    <Code className="w-4 h-4" />
                    HTML
                  </button>
                </div>

                {editingTemplate.available_variables && editingTemplate.available_variables.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: '#9090a8' }}>Variables:</span>
                    {editingTemplate.available_variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="px-2 py-0.5 text-xs font-mono rounded transition-colors"
                        style={{ background: 'rgba(79,110,247,0.15)', color: '#4f6ef7', border: '1px solid rgba(79,110,247,0.3)' }}
                        onClick={() => insertVariable(v)}
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {editorMode === 'content' ? (
                  <div className="h-full flex flex-col">
                    <ReactQuill
                      theme="snow"
                      value={editForm.html_template}
                      onChange={(value) => setEditForm({ ...editForm, html_template: value })}
                      modules={quillModules}
                      formats={quillFormats}
                      className="flex-1 flex flex-col"
                      placeholder="Design your email content here..."
                    />
                  </div>
                ) : (
                  <textarea
                    id="html-editor"
                    value={editForm.html_template}
                    onChange={(e) => setEditForm({ ...editForm, html_template: e.target.value })}
                    className="w-full h-full px-4 py-3 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                    style={{ background: '#09090f', color: '#ededf5' }}
                    placeholder="<html>...</html>"
                    spellCheck={false}
                  />
                )}
              </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="hidden md:flex md:w-1/2 flex-col" style={{ background: '#09090f' }}>
              <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid #1e1e30', background: 'rgba(18,18,31,0.7)' }}>
                <Eye className="w-4 h-4" style={{ color: '#9090a8' }} />
                <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Live Preview</span>
              </div>
              <div className="flex-1" style={{ background: '#fff' }}>
                <iframe
                  srcDoc={editForm.html_template}
                  className="w-full h-full"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quill Styles */}
      <style jsx global>{`
        .ql-container {
          flex: 1;
          overflow: auto;
          font-size: 14px;
        }
        .ql-editor {
          min-height: 100%;
        }
        .ql-toolbar {
          border: none !important;
          border-bottom: 1px solid #1e1e30 !important;
          background: rgba(9,9,15,0.5);
        }
        .ql-toolbar .ql-stroke {
          stroke: #9090a8;
        }
        .ql-toolbar .ql-fill {
          fill: #9090a8;
        }
        .ql-toolbar .ql-picker {
          color: #9090a8;
        }
        .ql-toolbar .ql-picker-options {
          background: #12121f;
          border-color: #1e1e30;
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .ql-editor {
          color: #ededf5;
          background: rgba(18,18,31,0.7);
        }
        .ql-editor.ql-blank::before {
          color: #9090a8;
        }
      `}</style>
    </div>
  );
}
