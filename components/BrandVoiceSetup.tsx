'use client';

import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UploadedDocument {
  id: string;
  documentType: string;
  wordCount: number;
  createdAt: string;
}

interface BrandVoiceSetupProps {
  onComplete?: () => void;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  pageBg:    '#09090f',
  cardBg:    'rgba(18,18,31,0.8)',
  border:    '#1e1e30',
  textPri:   '#ededf5',
  textMuted: '#9090a8',
  textDim:   '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
  // status surfaces
  errorBg:   'rgba(220,38,38,0.12)',
  errorBorder:'rgba(220,38,38,0.35)',
  successBg:  'rgba(34,197,94,0.12)',
  successBorder:'rgba(34,197,94,0.35)',
  infoBg:    'rgba(79,110,247,0.1)',
  infoBorder:'rgba(79,110,247,0.3)',
};
// ─────────────────────────────────────────────────────────────────────────────

export default function BrandVoiceSetup({ onComplete }: BrandVoiceSetupProps) {
  const [documentType, setDocumentType] = useState<string>('website_copy');
  const [content, setContent] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const documentTypes = [
    { value: 'website_copy', label: 'Website Copy', icon: '🌐' },
    { value: 'email', label: 'Email', icon: '📧' },
    { value: 'transcript', label: 'Transcript', icon: '🎤' },
    { value: 'social_media', label: 'Social Media', icon: '📱' },
  ];

  const handleUpload = async () => {
    if (!content.trim()) {
      setError('Please enter some content to upload');
      return;
    }

    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < 50) {
      setError('Content too short. Please provide at least 50 words for accurate analysis.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/api/brand-voice/upload', {
        documentType,
        content,
      });

      setUploadedDocs([...uploadedDocs, response.document]);
      setContent('');
      setSuccess(`Document uploaded successfully! (${response.document.wordCount} words)`);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await apiClient.delete(`/api/brand-voice/documents/${docId}`);
      setUploadedDocs(uploadedDocs.filter(doc => doc.id !== docId));
      setSuccess('Document deleted successfully');
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleAnalyze = async () => {
    if (uploadedDocs.length === 0) {
      setError('Please upload at least one document before analyzing');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post('/api/brand-voice/analyze');

      setSuccess('Brand voice analysis completed successfully!');

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.response?.data?.message || 'Failed to analyze brand voice');
    } finally {
      setAnalyzing(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
  const canUpload = wordCount >= 50;

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1.5rem' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(to right, ${T.purple}, ${T.blue})`,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          color: T.textPri,
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Sparkles style={{ width: '2rem', height: '2rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Brand Voice Setup</h2>
        </div>
        <p style={{ color: 'rgba(237,237,245,0.75)', margin: 0 }}>
          Upload samples of your writing to create a personalized brand voice profile.
          We'll analyze your style and apply it to all AI-generated content.
        </p>
      </div>

      {/* ── Status: error ───────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            background: T.errorBg,
            border: `1px solid ${T.errorBorder}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#f87171', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fca5a5', margin: '0 0 0.25rem' }}>Error</p>
            <p style={{ fontSize: '0.875rem', color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      {/* ── Status: success ─────────────────────────────────────────────────── */}
      {success && (
        <div
          style={{
            background: T.successBg,
            border: `1px solid ${T.successBorder}`,
            borderRadius: '0.5rem',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: '#4ade80', flexShrink: 0, marginTop: '0.125rem' }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#86efac', margin: '0 0 0.25rem' }}>Success</p>
            <p style={{ fontSize: '0.875rem', color: '#86efac', margin: 0 }}>{success}</p>
          </div>
        </div>
      )}

      {/* ── Upload form ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: T.cardBg,
          borderRadius: '0.75rem',
          border: `1px solid ${T.border}`,
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: T.textPri,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: 0,
            marginBottom: '1rem',
          }}
        >
          <Upload style={{ width: '1.25rem', height: '1.25rem' }} />
          Upload Writing Sample
        </h3>

        {/* Document type selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: T.textMuted, marginBottom: '0.5rem' }}>
            Document Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {documentTypes.map((type) => {
              const active = documentType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setDocumentType(type.value)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${active ? T.purple : T.border}`,
                    background: active ? 'rgba(124,91,246,0.15)' : 'transparent',
                    color: T.textPri,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{type.icon}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{type.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: T.textMuted, marginBottom: '0.5rem' }}>
            Content (minimum 50 words recommended)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your writing sample here... This could be website copy, an email you sent, a social media post, or a transcript of your speaking."
            style={{
              width: '100%',
              height: '16rem',
              padding: '0.75rem 1rem',
              border: `1px solid ${T.border}`,
              borderRadius: '0.5rem',
              background: 'rgba(9,9,15,0.6)',
              color: T.textPri,
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: canUpload ? '#4ade80' : T.textDim }}>
              {wordCount} words {canUpload ? '✓' : '(need at least 50)'}
            </span>
          </div>
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={uploading || !canUpload}
          style={{
            width: '100%',
            background: uploading || !canUpload ? 'rgba(90,90,114,0.4)' : T.blue,
            color: uploading || !canUpload ? T.textDim : '#fff',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            border: 'none',
            cursor: uploading || !canUpload ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background 0.15s',
          }}
        >
          {uploading ? (
            <>
              <Loader2 style={{ width: '1.25rem', height: '1.25rem' }} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
              Upload Document
            </>
          )}
        </button>
      </div>

      {/* ── Uploaded documents ──────────────────────────────────────────────── */}
      {uploadedDocs.length > 0 && (
        <div
          style={{
            background: T.cardBg,
            borderRadius: '0.75rem',
            border: `1px solid ${T.border}`,
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: T.textPri,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: 0,
              marginBottom: '1rem',
            }}
          >
            <FileText style={{ width: '1.25rem', height: '1.25rem' }} />
            Uploaded Documents ({uploadedDocs.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  background: 'rgba(9,9,15,0.5)',
                  borderRadius: '0.5rem',
                  border: `1px solid ${T.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText style={{ width: '1.25rem', height: '1.25rem', color: T.textDim }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: T.textPri, margin: 0 }}>
                      {documentTypes.find(t => t.value === doc.documentType)?.label}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: T.textMuted, margin: 0 }}>{doc.wordCount} words</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  aria-label="Delete document"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#f87171',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fca5a5'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                >
                  <Trash2 style={{ width: '1rem', height: '1rem' }} />
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              paddingTop: '1rem',
              borderTop: `1px solid ${T.border}`,
              marginTop: '1rem',
            }}
          >
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                width: '100%',
                background: analyzing
                  ? 'rgba(90,90,114,0.4)'
                  : `linear-gradient(to right, ${T.purple}, ${T.blue})`,
                color: analyzing ? T.textDim : '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: 'none',
                cursor: analyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.15s',
              }}
            >
              {analyzing ? (
                <>
                  <Loader2 style={{ width: '1.25rem', height: '1.25rem' }} className="animate-spin" />
                  Analyzing Your Brand Voice...
                </>
              ) : (
                <>
                  <Sparkles style={{ width: '1.25rem', height: '1.25rem' }} />
                  Analyze Brand Voice
                </>
              )}
            </button>
            <p style={{ fontSize: '0.75rem', color: T.textMuted, textAlign: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
              This will use AI to analyze your writing style and create your brand voice profile
            </p>
          </div>
        </div>
      )}

      {/* ── Tips ────────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: T.infoBg,
          border: `1px solid ${T.infoBorder}`,
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: T.textPri, marginTop: 0, marginBottom: '0.5rem' }}>
          💡 Tips for Best Results
        </h4>
        <ul style={{ fontSize: '0.875rem', color: T.textMuted, margin: 0, paddingLeft: '1.25rem', lineHeight: '1.75' }}>
          <li>Upload at least 500 words total for accurate analysis</li>
          <li>Include multiple document types (emails, website copy, etc.)</li>
          <li>Use your most representative writing samples</li>
          <li>You can upload more documents anytime to refine your profile</li>
        </ul>
      </div>
    </div>
  );
}
