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
  loading: () => <div className="h-full bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
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
      case 'transactional': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'onboarding': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'marketing': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'milestone': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'engagement': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const enabledCount = templates.filter(t => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
            statusMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
          }`}
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
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage automated email notifications
          </p>
        </div>
        <button
          onClick={fetchTemplates}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Templates</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{templates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enabled</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{enabledCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disabled</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{templates.length - enabledCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Email Templates</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Mail className="w-12 h-12 mb-3 opacity-30" />
            <p>No email templates found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {templates.map((template) => (
              <div key={template.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(template.category)}`}>
                        {template.category}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {template.description}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">Subject:</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{template.subject}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
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
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Edit template"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <span className={`text-xs font-medium ${template.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                      {template.enabled ? 'ON' : 'OFF'}
                    </span>
                    <button
                      onClick={() => toggleEnabled(template)}
                      disabled={saving === template.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        template.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {saving === template.id ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="w-3 h-3 animate-spin text-white" />
                        </span>
                      ) : (
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            template.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
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
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium mb-1">Email Template Notes</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
            <li>Disabled templates will not be sent even when triggered</li>
            <li>Verification and Password Reset emails should remain enabled for security</li>
            <li>Use variables like {'{{userName}}'} in templates for personalization</li>
            <li>Changes take effect immediately</li>
          </ul>
        </div>
      </div>

      {/* Fullscreen Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">Edit: {editForm.name}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">({editingTemplate.id})</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveTemplate}
                disabled={saving === editingTemplate.id}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
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
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top Bar: Metadata */}
          <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Main Content: Split View */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Panel: Editor */}
            <div className="w-full md:w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {/* Editor Toggle & Variables */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setEditorMode('content')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      editorMode === 'content'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Content
                  </button>
                  <button
                    onClick={() => setEditorMode('html')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      editorMode === 'html'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    HTML
                  </button>
                </div>

                {editingTemplate.available_variables && editingTemplate.available_variables.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Variables:</span>
                    {editingTemplate.available_variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="px-2 py-0.5 text-xs font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
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
                    className="w-full h-full px-4 py-3 bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                    placeholder="<html>...</html>"
                    spellCheck={false}
                  />
                )}
              </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="hidden md:flex md:w-1/2 flex-col bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <Eye className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Preview</span>
              </div>
              <div className="flex-1 bg-white">
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
          border-bottom: 1px solid #e5e7eb !important;
          background: #f9fafb;
        }
        .dark .ql-toolbar {
          background: #1f2937;
          border-color: #374151 !important;
        }
        .dark .ql-toolbar .ql-stroke {
          stroke: #9ca3af;
        }
        .dark .ql-toolbar .ql-fill {
          fill: #9ca3af;
        }
        .dark .ql-toolbar .ql-picker {
          color: #9ca3af;
        }
        .ql-container.ql-snow {
          border: none !important;
        }
        .dark .ql-editor {
          color: #e5e7eb;
          background: #1f2937;
        }
        .dark .ql-editor.ql-blank::before {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
