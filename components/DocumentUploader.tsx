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

export default function DocumentUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, addDocument, updateDocument, currentAgent } =
    useAppStore();

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
      alert('Please select an agent first');
      return;
    }

    const agentId = MINDSET_AGENTS[currentAgent].id;

    for (const file of files) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(
          `File type not supported: ${file.name}. Please upload PDF, DOCX, TXT, or MD files.`
        );
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }

      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

        // Upload file
        const response = await apiClient.uploadDocument(file, agentId);

        // Add to documents list
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

        // Poll for processing status
        pollDocumentStatus(response.documentId);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        alert(`Failed to upload ${file.name}`);
      }
    }
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
        clearInterval(interval);
      }
    }, 2000);
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await apiClient.deleteDocument(documentId);
      useAppStore.setState((state) => ({
        documents: state.documents.filter((doc) => doc.id !== documentId),
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Training Documents
      </h3>

      {/* Upload area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Drag and drop files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:underline"
          >
            browse
          </button>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Supported: PDF, DOCX, TXT, MD (Max 10MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mt-4 space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div
              key={filename}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {filename}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Uploaded Documents
          </h4>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group"
            >
              {getStatusIcon(doc.processingStatus)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {doc.filename}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="capitalize">{doc.processingStatus}</span>
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
                className="opacity-0 group-hover:opacity-100 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity"
                title="Delete document"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
