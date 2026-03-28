'use client';

import { useState, useEffect } from 'react';
import { Save, Edit3, Loader2, CheckCircle, AlertCircle, Sparkles, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface BrandVoiceProfile {
  id: string;
  tone: string | null;
  formalityLevel: string | null;
  sentenceStructure: string | null;
  vocabularyComplexity: string | null;
  usesContractions: boolean;
  usesEmojis: boolean;
  usesMetaphors: boolean;
  paragraphLength: string | null;
  voiceSummary: string | null;
  examplePhrases: string[];
  avoidPhrases: string[];
  analyzedDocuments: number;
  lastAnalysisAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BrandVoiceEditorProps {
  onSave?: (profile: BrandVoiceProfile) => void;
}

export default function BrandVoiceEditor({ onSave }: BrandVoiceEditorProps) {
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newExamplePhrase, setNewExamplePhrase] = useState('');
  const [newAvoidPhrase, setNewAvoidPhrase] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/brand-voice/profile');
      setProfile(response.profile);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.response?.data?.message || 'Failed to load brand voice profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiClient.put('/api/brand-voice/profile', profile);
      setProfile(response.profile);
      setSuccess(true);

      if (onSave) {
        onSave(response.profile);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to save brand voice profile');
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = (field: keyof BrandVoiceProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  const addExamplePhrase = () => {
    if (!profile || !newExamplePhrase.trim()) return;
    setProfile({
      ...profile,
      examplePhrases: [...profile.examplePhrases, newExamplePhrase.trim()],
    });
    setNewExamplePhrase('');
  };

  const removeExamplePhrase = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      examplePhrases: profile.examplePhrases.filter((_, i) => i !== index),
    });
  };

  const addAvoidPhrase = () => {
    if (!profile || !newAvoidPhrase.trim()) return;
    setProfile({
      ...profile,
      avoidPhrases: [...profile.avoidPhrases, newAvoidPhrase.trim()],
    });
    setNewAvoidPhrase('');
  };

  const removeAvoidPhrase = (index: number) => {
    if (!profile) return;
    setProfile({
      ...profile,
      avoidPhrases: profile.avoidPhrases.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading brand voice profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Failed to load profile</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadProfile}
              className="mt-4 text-sm text-red-700 hover:text-red-800 font-medium flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            No Brand Voice Profile Yet
          </h3>
          <p className="text-blue-700 mb-4">
            Upload writing samples first to create your brand voice profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="h-8 w-8" />
              <h2 className="text-2xl font-bold">Edit Brand Voice</h2>
            </div>
            <p className="text-purple-100">
              Fine-tune your brand voice profile to match your unique writing style.
            </p>
          </div>
          {profile.lastAnalysisAt && (
            <div className="text-right text-sm">
              <p className="text-purple-100">Last analyzed</p>
              <p className="font-medium">{new Date(profile.lastAnalysisAt).toLocaleDateString()}</p>
              <p className="text-xs text-purple-200 mt-1">
                {profile.analyzedDocuments} documents
              </p>
            </div>
          )}
        </div>
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
            <p className="text-sm text-green-700">Brand voice profile updated successfully!</p>
          </div>
        </div>
      )}

      {/* Voice Characteristics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Voice Characteristics</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tone
            </label>
            <input
              type="text"
              value={profile.tone || ''}
              onChange={(e) => updateProfile('tone', e.target.value)}
              placeholder="e.g., professional yet approachable"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formality Level
            </label>
            <select
              value={profile.formalityLevel || ''}
              onChange={(e) => updateProfile('formalityLevel', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              <option value="formal">Formal</option>
              <option value="semi-formal">Semi-formal</option>
              <option value="informal">Informal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sentence Structure
            </label>
            <input
              type="text"
              value={profile.sentenceStructure || ''}
              onChange={(e) => updateProfile('sentenceStructure', e.target.value)}
              placeholder="e.g., varied - short and long"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vocabulary Complexity
            </label>
            <select
              value={profile.vocabularyComplexity || ''}
              onChange={(e) => updateProfile('vocabularyComplexity', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paragraph Length
            </label>
            <select
              value={profile.paragraphLength || ''}
              onChange={(e) => updateProfile('paragraphLength', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select...</option>
              <option value="short">Short (1-2 sentences)</option>
              <option value="medium">Medium (3-5 sentences)</option>
              <option value="long">Long (6+ sentences)</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesContractions}
              onChange={(e) => updateProfile('usesContractions', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Uses Contractions</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesEmojis}
              onChange={(e) => updateProfile('usesEmojis', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Uses Emojis</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesMetaphors}
              onChange={(e) => updateProfile('usesMetaphors', e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700">Uses Metaphors</span>
          </label>
        </div>
      </div>

      {/* Voice Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Voice Summary</h3>
        <textarea
          value={profile.voiceSummary || ''}
          onChange={(e) => updateProfile('voiceSummary', e.target.value)}
          placeholder="Describe your overall writing voice..."
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Example Phrases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Example Phrases</h3>
        <p className="text-sm text-gray-600">
          Phrases and expressions you frequently use in your writing
        </p>

        <div className="space-y-2">
          {profile.examplePhrases.map((phrase, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <span className="flex-1 text-sm text-gray-900">{phrase}</span>
              <button
                onClick={() => removeExamplePhrase(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newExamplePhrase}
            onChange={(e) => setNewExamplePhrase(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addExamplePhrase()}
            placeholder="Add a phrase you use often..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={addExamplePhrase}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Avoid Phrases */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Phrases to Avoid</h3>
        <p className="text-sm text-gray-600">
          Clichés or phrases you never use in your writing
        </p>

        <div className="space-y-2">
          {profile.avoidPhrases.map((phrase, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <span className="flex-1 text-sm text-gray-900">{phrase}</span>
              <button
                onClick={() => removeAvoidPhrase(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newAvoidPhrase}
            onChange={(e) => setNewAvoidPhrase(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAvoidPhrase()}
            placeholder="Add a phrase to avoid..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={addAvoidPhrase}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
