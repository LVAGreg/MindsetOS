'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, History, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface CoreMemories {
  id?: string;
  user_id?: string;

  // Section 1: Business Identity
  full_name?: string;
  company_name?: string;
  business_outcome?: string;

  // Section 2: Client Profile
  target_clients?: string;
  client_problems?: string[];
  client_results?: string;

  // Section 3: Methodology
  core_method?: string;
  frameworks?: string[];

  // Section 4: Service Details
  service_description?: string;
  pricing_model?: string;
  delivery_timeline?: string;

  // Section 5: Current State
  revenue_range?: string;
  growth_goals?: string;
  biggest_challenges?: string[];

  created_at?: string;
  updated_at?: string;
}

interface AuditLogEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  source: 'manual' | 'agent' | 'system';
  agent_name?: string;
  changed_at: string;
}

interface CoreMemoriesEditorProps {
  onSave?: (memories: CoreMemories) => void;
  showHistory?: boolean;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  pageBg:    '#09090f',
  cardBg:    'rgba(18,18,31,0.8)',
  border:    '#1e1e30',
  textPrim:  '#ededf5',
  textMuted: '#9090a8',
  textDim:   '#5a5a72',
  blue:      '#4f6ef7',
  amber:     '#fcc824',
  purple:    '#7c5bf6',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 16px',
  border: `1px solid ${T.border}`,
  borderRadius: '6px',
  background: 'rgba(18,18,31,0.6)',
  color: T.textPrim,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: T.textMuted,
  marginBottom: '8px',
};

const sectionStyle: React.CSSProperties = {
  background: T.cardBg,
  borderRadius: '8px',
  border: `1px solid ${T.border}`,
  padding: '24px',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 600,
  color: T.textPrim,
  marginBottom: '16px',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CoreMemoriesEditor({ onSave, showHistory = false }: CoreMemoriesEditorProps) {
  const [memories, setMemories] = useState<CoreMemories>({});
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCoreMemories();
  }, []);

  const loadCoreMemories = async () => {
    setLoading(true);
    setError(null);

    try {
      const includeAuditLog = showHistory ? '?includeAuditLog=true' : '';
      const response = await apiClient.get(`/api/profile/core-memories${includeAuditLog}`);

      setMemories(response.coreMemories || {});
      setAuditLog(response.auditLog || []);
    } catch (err: any) {
      console.error('Error loading core memories:', err);
      setError(err.message || 'Failed to load core memories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await apiClient.put('/api/profile/core-memories', memories);

      if (response.success) {
        setSuccess(true);
        setMemories(response.coreMemories);

        if (onSave) {
          onSave(response.coreMemories);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error(response.error || 'Failed to save');
      }
    } catch (err: any) {
      console.error('Error saving core memories:', err);
      setError(err.message || 'Failed to save core memories');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CoreMemories, value: any) => {
    setMemories(prev => ({ ...prev, [field]: value }));
  };

  const addArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges') => {
    const current = memories[field] || [];
    updateField(field, [...current, '']);
  };

  const updateArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges', index: number, value: string) => {
    const current = memories[field] || [];
    const updated = [...current];
    updated[index] = value;
    updateField(field, updated);
  };

  const removeArrayItem = (field: 'client_problems' | 'frameworks' | 'biggest_challenges', index: number) => {
    const current = memories[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
        <Loader2 style={{ width: 32, height: 32, color: T.purple }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: T.textPrim }}>Core Memories</h2>
          <p style={{ fontSize: '0.875rem', color: T.textMuted, marginTop: '4px' }}>
            Manage your business profile and key information
          </p>
        </div>

        {showHistory && auditLog.length > 0 && (
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              background: 'rgba(18,18,31,0.6)',
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <History style={{ width: 16, height: 16 }} />
            {showAuditLog ? 'Hide' : 'Show'} History
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          background: 'rgba(34,197,94,0.1)',
          color: '#4ade80',
          borderRadius: '8px',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
          <CheckCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
          <span>Core memories updated successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          background: 'rgba(239,68,68,0.1)',
          color: '#f87171',
          borderRadius: '8px',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log */}
      {showAuditLog && auditLog.length > 0 && (
        <div style={{ ...sectionStyle }}>
          <h3 style={{ fontWeight: 600, color: T.textPrim, marginBottom: '12px' }}>Change History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '256px', overflowY: 'auto' }}>
            {auditLog.map((entry) => (
              <div key={entry.id} style={{ fontSize: '0.875rem', borderLeft: `2px solid ${T.purple}`, paddingLeft: '12px', paddingTop: '4px', paddingBottom: '4px' }}>
                <div style={{ fontWeight: 500, color: T.textPrim }}>
                  {entry.field_name.replace(/_/g, ' ')}
                </div>
                <div style={{ color: T.textMuted }}>
                  {entry.source === 'agent' && entry.agent_name && (
                    <span style={{ color: T.purple }}>Updated by {entry.agent_name}</span>
                  )}
                  {entry.source === 'manual' && (
                    <span style={{ color: T.blue }}>Updated manually</span>
                  )}
                  {' • '}
                  {new Date(entry.changed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Section 1: Business Identity */}
        <div style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Business Identity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={memories.full_name || ''}
                onChange={(e) => updateField('full_name', e.target.value)}
                style={inputStyle}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                value={memories.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                style={inputStyle}
                placeholder="Your company name"
              />
            </div>

            <div>
              <label style={labelStyle}>Business Outcome</label>
              <textarea
                value={memories.business_outcome || ''}
                onChange={(e) => updateField('business_outcome', e.target.value)}
                rows={3}
                style={inputStyle}
                placeholder="What outcome do you deliver for clients?"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Client Profile */}
        <div style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Client Profile</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Target Clients</label>
              <input
                type="text"
                value={memories.target_clients || ''}
                onChange={(e) => updateField('target_clients', e.target.value)}
                style={inputStyle}
                placeholder="Who are your ideal clients?"
              />
            </div>

            <div>
              <label style={labelStyle}>Client Problems</label>
              {(memories.client_problems || []).map((problem, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={problem}
                    onChange={(e) => updateArrayItem('client_problems', index, e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 200px' }}
                    placeholder={`Problem ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('client_problems', index)}
                    aria-label={`Remove problem ${index + 1}`}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('client_problems')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  background: `rgba(124,91,246,0.1)`,
                  color: T.purple,
                  border: `1px solid rgba(124,91,246,0.2)`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Add Problem
              </button>
            </div>

            <div>
              <label style={labelStyle}>Client Results</label>
              <textarea
                value={memories.client_results || ''}
                onChange={(e) => updateField('client_results', e.target.value)}
                rows={3}
                style={inputStyle}
                placeholder="What tangible results do clients get?"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Methodology */}
        <div style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Methodology</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Core Method</label>
              <textarea
                value={memories.core_method || ''}
                onChange={(e) => updateField('core_method', e.target.value)}
                rows={3}
                style={inputStyle}
                placeholder="Your core methodology or approach"
              />
            </div>

            <div>
              <label style={labelStyle}>Frameworks</label>
              {(memories.frameworks || []).map((framework, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={framework}
                    onChange={(e) => updateArrayItem('frameworks', index, e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 200px' }}
                    placeholder={`Framework ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('frameworks', index)}
                    aria-label={`Remove framework ${index + 1}`}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('frameworks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  background: `rgba(124,91,246,0.1)`,
                  color: T.purple,
                  border: `1px solid rgba(124,91,246,0.2)`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Add Framework
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Service Details */}
        <div style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Service Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Service Description</label>
              <textarea
                value={memories.service_description || ''}
                onChange={(e) => updateField('service_description', e.target.value)}
                rows={3}
                style={inputStyle}
                placeholder="Describe your service offering"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Pricing Model</label>
                <input
                  type="text"
                  value={memories.pricing_model || ''}
                  onChange={(e) => updateField('pricing_model', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., monthly retainer, project-based"
                />
              </div>

              <div>
                <label style={labelStyle}>Delivery Timeline</label>
                <input
                  type="text"
                  value={memories.delivery_timeline || ''}
                  onChange={(e) => updateField('delivery_timeline', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g., 90 days, 6 months"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Current State */}
        <div style={sectionStyle}>
          <h3 style={sectionHeadingStyle}>Current State</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Revenue Range</label>
              <input
                type="text"
                value={memories.revenue_range || ''}
                onChange={(e) => updateField('revenue_range', e.target.value)}
                style={inputStyle}
                placeholder="e.g., $10k-$30k/month"
              />
            </div>

            <div>
              <label style={labelStyle}>Growth Goals</label>
              <textarea
                value={memories.growth_goals || ''}
                onChange={(e) => updateField('growth_goals', e.target.value)}
                rows={3}
                style={inputStyle}
                placeholder="What are your business growth goals?"
              />
            </div>

            <div>
              <label style={labelStyle}>Biggest Challenges</label>
              {(memories.biggest_challenges || []).map((challenge, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={challenge}
                    onChange={(e) => updateArrayItem('biggest_challenges', index, e.target.value)}
                    style={{ ...inputStyle, flex: '1 1 200px' }}
                    placeholder={`Challenge ${index + 1}`}
                  />
                  <button
                    onClick={() => removeArrayItem('biggest_challenges', index)}
                    aria-label={`Remove challenge ${index + 1}`}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(239,68,68,0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addArrayItem('biggest_challenges')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '0.875rem',
                  background: `rgba(124,91,246,0.1)`,
                  color: T.purple,
                  border: `1px solid rgba(124,91,246,0.2)`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Plus style={{ width: 16, height: 16 }} />
                Add Challenge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: saving ? 'rgba(79,110,247,0.5)' : T.blue,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'opacity 0.15s',
          }}
        >
          {saving ? (
            <>
              <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save style={{ width: 16, height: 16 }} />
              <span>Save Core Memories</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
