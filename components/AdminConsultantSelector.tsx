'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface Consultant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  memory_count: string;
  conversation_count: string;
}

interface AdminConsultantSelectorProps {
  onSelectConsultant?: (consultantId: string, email: string) => void;
}

export default function AdminConsultantSelector({ onSelectConsultant }: AdminConsultantSelectorProps) {
  const { setUser, user } = useAppStore();
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearingId, setIsClearingId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsultants();
    if (user?.id) {
      setSelectedId(user.id);
    }
  }, [user?.id]);

  const fetchConsultants = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants`);
      if (res.ok) {
        const data = await res.json();
        setConsultants(data);
      }
    } catch (err) {
      setError('Failed to fetch consultants');
    }
  };

  const handleSelect = async (consultant: Consultant) => {
    setSelectedId(consultant.id);

    setUser({
      id: consultant.id,
      email: consultant.email,
      name: `${consultant.first_name} ${consultant.last_name}`.trim(),
      firstName: consultant.first_name,
      lastName: consultant.last_name,
      role: 'user',
      emailVerified: true
    });

    setIsExpanded(false);
    window.location.reload();

    if (onSelectConsultant) {
      onSelectConsultant(consultant.id, consultant.email);
    }
  };

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          firstName: newFirstName,
          lastName: newLastName
        })
      });

      if (res.ok) {
        setNewEmail('');
        setNewFirstName('');
        setNewLastName('');
        setIsCreating(false);
        await fetchConsultants();
      } else {
        setError('Failed to create consultant');
      }
    } catch (err) {
      setError('Failed to create consultant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearMemories = async (consultantId: string) => {
    if (!confirm('Clear all memories for this consultant? This cannot be undone.')) return;

    setIsClearingId(consultantId);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants/${consultantId}/memories`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchConsultants();
        alert('Memories cleared successfully');
      } else {
        setError('Failed to clear memories');
      }
    } catch (err) {
      setError('Failed to clear memories');
    } finally {
      setIsClearingId(null);
    }
  };

  const selectedConsultant = consultants.find(c => c.id === selectedId);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Collapsed Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'linear-gradient(to right, #7c5bf6, #4f6ef7)',
            color: '#ededf5',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        >
          <Users className="w-5 h-5" />
          <span style={{ fontWeight: 500 }}>
            {selectedConsultant ? selectedConsultant.email : 'Select Consultant'}
          </span>
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div
          style={{
            background: '#09090f',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            border: '1px solid #1e1e30',
            width: '384px',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #1e1e30',
              background: 'linear-gradient(to right, #7c5bf6, #4f6ef7)',
              color: '#ededf5',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users className="w-5 h-5" />
                <h3 style={{ fontWeight: 600, margin: 0 }}>Admin: Consultant Selector</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Close consultant selector"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(237,237,245,0.75)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '2px 4px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ededf5'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(237,237,245,0.75)'; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(239,68,68,0.15)',
                borderBottom: '1px solid #1e1e30',
                color: '#f87171',
                fontSize: '13px',
              }}
            >
              {error}
            </div>
          )}

          {/* Consultant List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {consultants.map((consultant) => {
                const isSelected = selectedId === consultant.id;
                return (
                  <div
                    key={consultant.id}
                    onClick={() => handleSelect(consultant)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid #4f6ef7' : '1px solid #1e1e30',
                      background: isSelected ? 'rgba(79,110,247,0.12)' : 'rgba(18,18,31,0.8)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#5a5a72';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = '#1e1e30';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#ededf5' }}>
                          {consultant.first_name} {consultant.last_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#9090a8', marginTop: '2px' }}>
                          {consultant.email}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#5a5a72', flexWrap: 'wrap' }}>
                          <span>📊 {consultant.memory_count} memories</span>
                          <span>💬 {consultant.conversation_count} chats</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearMemories(consultant.id);
                        }}
                        aria-label="Clear all memories for this consultant"
                        disabled={isClearingId === consultant.id}
                        style={{
                          marginLeft: '8px',
                          padding: '6px',
                          background: 'none',
                          border: 'none',
                          color: isClearingId === consultant.id ? '#5a5a72' : '#f87171',
                          cursor: isClearingId === consultant.id ? 'not-allowed' : 'pointer',
                          borderRadius: '6px',
                          transition: 'background 0.15s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={(e) => {
                          if (isClearingId !== consultant.id)
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'none';
                        }}
                      >
                        {isClearingId === consultant.id ? (
                          <RefreshCw className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create New Consultant */}
          <div
            style={{
              borderTop: '1px solid #1e1e30',
              padding: '16px',
              background: 'rgba(18,18,31,0.8)',
            }}
          >
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#fcc824',
                  color: '#09090f',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              >
                <Plus className="w-4 h-4" />
                Create New Consultant
              </button>
            ) : (
              <form onSubmit={handleCreateConsultant} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #1e1e30',
                    borderRadius: '8px',
                    background: '#09090f',
                    color: '#ededf5',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    style={{
                      flex: '1 1 100px',
                      padding: '8px 12px',
                      border: '1px solid #1e1e30',
                      borderRadius: '8px',
                      background: '#09090f',
                      color: '#ededf5',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    style={{
                      flex: '1 1 100px',
                      padding: '8px 12px',
                      border: '1px solid #1e1e30',
                      borderRadius: '8px',
                      background: '#09090f',
                      color: '#ededf5',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: '1 1 80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: isSubmitting ? '#5a5a72' : '#fcc824',
                      color: '#09090f',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-3.5 h-3.5" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : null}
                    {isSubmitting ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setIsCreating(false);
                      setNewEmail('');
                      setNewFirstName('');
                      setNewLastName('');
                      setError(null);
                    }}
                    style={{
                      flex: '1 1 80px',
                      padding: '8px 16px',
                      background: '#1e1e30',
                      color: '#9090a8',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Refresh Button */}
          <div style={{ borderTop: '1px solid #1e1e30', padding: '12px' }}>
            <button
              onClick={fetchConsultants}
              aria-label="Refresh consultant list"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                color: '#9090a8',
                cursor: 'pointer',
                fontSize: '13px',
                borderRadius: '8px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#1e1e30'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
