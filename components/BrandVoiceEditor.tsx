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
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#7c5bf6' }} />
          <p style={{ color: '#9090a8' }}>Loading brand voice profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-lg p-6 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1">
            <p className="font-medium" style={{ color: '#ededf5' }}>Failed to load profile</p>
            <p className="text-sm mt-1" style={{ color: '#9090a8' }}>{error}</p>
            <button
              onClick={loadProfile}
              className="mt-4 text-sm font-medium flex items-center gap-2"
              style={{ color: '#f87171' }}
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
        <div
          className="rounded-lg p-6 text-center"
          style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.3)' }}
        >
          <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: '#4f6ef7' }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#ededf5' }}>
            No Brand Voice Profile Yet
          </h3>
          <p style={{ color: '#9090a8' }} className="mb-4">
            Upload writing samples first to create your brand voice profile.
          </p>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(18,18,31,0.8)',
    border: '1px solid #1e1e30',
    color: '#ededf5',
    borderRadius: '0.5rem',
    padding: '0.5rem 1rem',
    width: '100%',
    outline: 'none',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(18,18,31,0.8)',
    border: '1px solid #1e1e30',
    borderRadius: '0.5rem',
    padding: '1.5rem',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#9090a8',
    marginBottom: '0.5rem',
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-6"
        style={{ background: 'linear-gradient(to right, #7c5bf6, #4f6ef7)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Edit3 className="h-8 w-8" style={{ color: '#ededf5' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#ededf5' }}>Edit Brand Voice</h2>
            </div>
            <p style={{ color: 'rgba(237,237,245,0.75)' }}>
              Fine-tune your brand voice profile to match your unique writing style.
            </p>
          </div>
          {profile.lastAnalysisAt && (
            <div className="text-right text-sm">
              <p style={{ color: 'rgba(237,237,245,0.75)' }}>Last analyzed</p>
              <p className="font-medium" style={{ color: '#ededf5' }}>
                {new Date(profile.lastAnalysisAt).toLocaleDateString()}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(237,237,245,0.55)' }}>
                {profile.analyzedDocuments} documents
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#ededf5' }}>Error</p>
            <p className="text-sm" style={{ color: '#9090a8' }}>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#ededf5' }}>Success</p>
            <p className="text-sm" style={{ color: '#9090a8' }}>Brand voice profile updated successfully!</p>
          </div>
        </div>
      )}

      {/* Voice Characteristics */}
      <div style={cardStyle} className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Voice Characteristics</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Tone</label>
            <input
              type="text"
              value={profile.tone || ''}
              onChange={(e) => updateProfile('tone', e.target.value)}
              placeholder="e.g., professional yet approachable"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Formality Level</label>
            <select
              value={profile.formalityLevel || ''}
              onChange={(e) => updateProfile('formalityLevel', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select...</option>
              <option value="formal">Formal</option>
              <option value="semi-formal">Semi-formal</option>
              <option value="informal">Informal</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Sentence Structure</label>
            <input
              type="text"
              value={profile.sentenceStructure || ''}
              onChange={(e) => updateProfile('sentenceStructure', e.target.value)}
              placeholder="e.g., varied - short and long"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Vocabulary Complexity</label>
            <select
              value={profile.vocabularyComplexity || ''}
              onChange={(e) => updateProfile('vocabularyComplexity', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select...</option>
              <option value="simple">Simple</option>
              <option value="moderate">Moderate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Paragraph Length</label>
            <select
              value={profile.paragraphLength || ''}
              onChange={(e) => updateProfile('paragraphLength', e.target.value)}
              style={inputStyle}
            >
              <option value="">Select...</option>
              <option value="short">Short (1-2 sentences)</option>
              <option value="medium">Medium (3-5 sentences)</option>
              <option value="long">Long (6+ sentences)</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div
          className="grid md:grid-cols-3 gap-4 pt-4"
          style={{ borderTop: '1px solid #1e1e30' }}
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesContractions}
              onChange={(e) => updateProfile('usesContractions', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ accentColor: '#7c5bf6' }}
            />
            <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Uses Contractions</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesEmojis}
              onChange={(e) => updateProfile('usesEmojis', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ accentColor: '#7c5bf6' }}
            />
            <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Uses Emojis</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.usesMetaphors}
              onChange={(e) => updateProfile('usesMetaphors', e.target.checked)}
              className="w-5 h-5 rounded"
              style={{ accentColor: '#7c5bf6' }}
            />
            <span className="text-sm font-medium" style={{ color: '#9090a8' }}>Uses Metaphors</span>
          </label>
        </div>
      </div>

      {/* Voice Summary */}
      <div style={cardStyle} className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Voice Summary</h3>
        <textarea
          value={profile.voiceSummary || ''}
          onChange={(e) => updateProfile('voiceSummary', e.target.value)}
          placeholder="Describe your overall writing voice..."
          className="resize-none"
          style={{ ...inputStyle, height: '8rem', padding: '0.75rem 1rem' }}
        />
      </div>

      {/* Example Phrases */}
      <div style={cardStyle} className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Example Phrases</h3>
        <p className="text-sm" style={{ color: '#9090a8' }}>
          Phrases and expressions you frequently use in your writing
        </p>

        <div className="space-y-2">
          {profile.examplePhrases.map((phrase, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
            >
              <span className="flex-1 text-sm" style={{ color: '#ededf5' }}>{phrase}</span>
              <button
                onClick={() => removeExamplePhrase(index)}
                aria-label={`Remove example phrase: ${phrase}`}
                style={{ color: '#f87171' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newExamplePhrase}
            onChange={(e) => setNewExamplePhrase(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addExamplePhrase()}
            placeholder="Add a phrase you use often..."
            style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '12rem' }}
          />
          <button
            onClick={addExamplePhrase}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Avoid Phrases */}
      <div style={cardStyle} className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Phrases to Avoid</h3>
        <p className="text-sm" style={{ color: '#9090a8' }}>
          Clichés or phrases you never use in your writing
        </p>

        <div className="space-y-2">
          {profile.avoidPhrases.map((phrase, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <span className="flex-1 text-sm" style={{ color: '#ededf5' }}>{phrase}</span>
              <button
                onClick={() => removeAvoidPhrase(index)}
                aria-label={`Remove avoid phrase: ${phrase}`}
                style={{ color: '#f87171' }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newAvoidPhrase}
            onChange={(e) => setNewAvoidPhrase(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addAvoidPhrase()}
            placeholder="Add a phrase to avoid..."
            style={{ ...inputStyle, width: 'auto', flex: 1, minWidth: '12rem' }}
          />
          <button
            onClick={addAvoidPhrase}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
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
          className="px-8 py-3 rounded-lg font-medium flex items-center gap-2"
          style={{
            background: saving ? '#5a5a72' : '#7c5bf6',
            color: '#ededf5',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
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
