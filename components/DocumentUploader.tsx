'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bgPage:    '#09090f',
  bgCard:    'rgba(18,18,31,0.8)',
  bgRow:     'rgba(255,255,255,0.04)',
  border:    '#1e1e30',
  textPrimary: '#ededf5',
  textMuted:   '#9090a8',
  textDim:     '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
  green:     '#22c55e',
  red:       '#f87171',
} as const;

export default function DocumentUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, addDocument, updateDocument, currentAgent } = useAppStore();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    await handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    if (!currentAgent) {
      setUploadError('Please select an agent first');
      return;
    }

    const agentId = MINDSET_AGENTS[currentAgent].id;
    setIsUploading(true);
    setUploadError(null);

    for (const file of files) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ];

      if (!allowedTypes.includes(file.type)) {
        setUploadError(`File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, or MD files.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        const response = await apiClient.uploadDocument(file, agentId);

        addDocument({
          id: response.documentId,
          filename: file.name,
          fileType: file.type,
          processingStatus: 'pending',
          chunkCount: 0,
          embeddingCount: 0,
          createdAt: new Date(),
        });

        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        pollDocumentStatus(response.documentId);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadError(`Failed to upload ${file.name}. Please try again.`);
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      }
    }

    setIsUploading(false);
  };

  const pollDocumentStatus = async (documentId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await apiClient.getDocumentStatus(documentId);

        updateDocument(documentId, {
          processingStatus: status.processingStatus,
          chunkCount: status.chunkCount,
          embeddingCount: status.embeddingCount,
        });

        if (
          status.processingStatus === 'completed' ||
          status.processingStatus === 'failed'
        ) {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling document status:', error);
        setUploadError('Lost contact with server while processing document. Check status manually.');
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleDeleteDocument = async (documentId: string) => {
    setDeletingId(documentId);
    try {
      await apiClient.deleteDocument(documentId);
      useAppStore.setState((state) => ({
        documents: state.documents.filter((doc) => doc.id !== documentId),
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadError('Failed to delete document. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle style={{ width: 20, height: 20, color: T.green }} />;
      case 'failed':
        return <AlertCircle style={{ width: 20, height: 20, color: T.red }} />;
      case 'processing':
      case 'pending':
        return (
          <Loader2
            className="animate-spin"
            style={{ width: 20, height: 20, color: T.blue }}
          />
        );
      default:
        return <File style={{ width: 20, height: 20, color: T.textDim }} />;
    }
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        background: T.bgCard,
        borderRadius: '0.5rem',
        border: `1px solid ${T.border}`,
      }}
    >
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: T.textPrimary,
          marginBottom: '1rem',
        }}
      >
        Training Documents
      </h3>

      {/* Error banner */}
      {uploadError && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            background: 'rgba(248,113,113,0.1)',
            border: `1px solid ${T.red}`,
            color: T.red,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span>{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            aria-label="Dismiss error"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, padding: 0 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      )}

      {/* Upload area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? T.blue : T.border}`,
          borderRadius: '0.5rem',
          padding: '2rem',
          textAlign: 'center',
          background: isDragging ? 'rgba(79,110,247,0.08)' : 'transparent',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <Upload
          style={{ width: 48, height: 48, margin: '0 auto 1rem', color: T.textDim, display: 'block' }}
        />
        <p style={{ fontSize: '0.875rem', color: T.textMuted, marginBottom: '0.5rem' }}>
          Drag and drop files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Browse files to upload"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: isUploading ? 'not-allowed' : 'pointer',
              color: isUploading ? T.textDim : T.blue,
              textDecoration: 'underline',
              font: 'inherit',
            }}
          >
            browse
          </button>
        </p>
        <p style={{ fontSize: '0.75rem', color: T.textDim }}>
          Supported: PDF, DOCX, TXT, MD (Max 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div
              key={filename}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: T.bgRow,
                borderRadius: '0.5rem',
              }}
            >
              <Loader2
                className="animate-spin"
                style={{ width: 16, height: 16, color: T.blue, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: T.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {filename}
                </p>
                <div
                  style={{
                    width: '100%',
                    background: T.border,
                    borderRadius: '9999px',
                    height: 6,
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      background: T.blue,
                      height: 6,
                      borderRadius: '9999px',
                      transition: 'width 0.3s',
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: T.textMuted,
              marginBottom: '0.5rem',
            }}
          >
            Uploaded Documents
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: T.bgRow,
                  borderRadius: '0.5rem',
                }}
              >
                {getStatusIcon(doc.processingStatus)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: T.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.filename}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: T.textDim,
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>{doc.processingStatus}</span>
                    {doc.chunkCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{doc.chunkCount} chunks</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.filename}`}
                  style={{
                    padding: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: deletingId === doc.id ? 'not-allowed' : 'pointer',
                    color: T.red,
                    borderRadius: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: deletingId === doc.id ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                  }}
                >
                  {deletingId === doc.id ? (
                    <Loader2
                      className="animate-spin"
                      style={{ width: 16, height: 16 }}
                    />
                  ) : (
                    <X style={{ width: 16, height: 16 }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
