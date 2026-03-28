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
      const response = await apiClient.post('/api/brand-voice/analyze');

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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8" />
          <h2 className="text-2xl font-bold">Brand Voice Setup</h2>
        </div>
        <p className="text-purple-100">
          Upload samples of your writing to create a personalized brand voice profile.
          We'll analyze your style and apply it to all AI-generated content.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Success</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Writing Sample
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {documentTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setDocumentType(type.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  documentType === type.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{type.icon}</div>
                <div className="text-sm font-medium text-gray-900">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content (minimum 50 words recommended)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your writing sample here... This could be website copy, an email you sent, a social media post, or a transcript of your speaking."
            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${canUpload ? 'text-green-600' : 'text-gray-500'}`}>
              {wordCount} words {canUpload ? '✓' : '(need at least 50)'}
            </span>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !canUpload}
          className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              Upload Document
            </>
          )}
        </button>
      </div>

      {/* Uploaded Documents */}
      {uploadedDocs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Uploaded Documents ({uploadedDocs.length})
          </h3>

          <div className="space-y-2">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {documentTypes.find(t => t.value === doc.documentType)?.label}
                    </p>
                    <p className="text-xs text-gray-500">{doc.wordCount} words</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Your Brand Voice...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Analyze Brand Voice
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              This will use AI to analyze your writing style and create your brand voice profile
            </p>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Best Results</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload at least 500 words total for accurate analysis</li>
          <li>• Include multiple document types (emails, website copy, etc.)</li>
          <li>• Use your most representative writing samples</li>
          <li>• You can upload more documents anytime to refine your profile</li>
        </ul>
      </div>
    </div>
  );
}
