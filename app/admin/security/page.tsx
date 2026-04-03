'use client';

import { useState, useEffect } from 'react';
import { Shield, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

interface SecurityEvent {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  agent_id: string;
  conversation_id: string;
  user_email: string;
  user_name: string;
  agent_name: string;
  event_type: string;
  severity: string;
}

interface SecurityStats {
  jailbreakAttempts: number;
  events: { total: number; unresolved: number; byType: Record<string, number> };
  patternsMonitored: number;
}

const cardStyle = {
  background: 'rgba(18,18,31,0.7)',
  border: '1px solid #1e1e30',
  borderRadius: 16,
};

const severityStyle = (s: string): React.CSSProperties => {
  switch (s) {
    case 'high':
      return {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    case 'medium':
      return {
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    case 'low':
      return {
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.2)',
        color: '#4ade80',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    default:
      return {
        background: 'rgba(144,144,168,0.1)',
        border: '1px solid rgba(144,144,168,0.2)',
        color: '#9090a8',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
  }
};

const typeStyle = (t: string): React.CSSProperties => {
  switch (t) {
    case 'jailbreak_attempt':
      return {
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        color: '#f87171',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    case 'prompt_injection':
      return {
        background: 'rgba(249,115,22,0.1)',
        border: '1px solid rgba(249,115,22,0.3)',
        color: '#fb923c',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    case 'config_access':
      return {
        background: 'rgba(124,91,246,0.1)',
        border: '1px solid rgba(124,91,246,0.3)',
        color: '#a78bfa',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    case 'suspicious_pattern':
      return {
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
    default:
      return {
        background: 'rgba(144,144,168,0.1)',
        border: '1px solid rgba(144,144,168,0.2)',
        color: '#9090a8',
        borderRadius: 8,
        padding: '1px 8px',
        fontSize: 11,
        fontWeight: 600,
      };
  }
};

const typeLabel = (t: string) => {
  switch (t) {
    case 'jailbreak_attempt': return 'Jailbreak';
    case 'prompt_injection': return 'Prompt Injection';
    case 'config_access': return 'Config Access';
    case 'suspicious_pattern': return 'Suspicious';
    default: return t;
  }
};

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/security/stats', { headers }),
        fetch('/api/admin/security/events?limit=100', { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch {
      setFetchError('Failed to load security data. Please refresh.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredEvents = events.filter(e => {
    if (filterType !== 'all' && e.event_type !== filterType) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div style={{ background: '#09090f', minHeight: '100vh', padding: 24 }}>
      {fetchError && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
          <span>{fetchError}</span>
          <button onClick={() => setFetchError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" style={{ color: '#f87171' }} />
          <h1 style={{ color: '#ededf5', fontSize: 24, fontWeight: 700 }}>Security Monitor</h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-opacity disabled:opacity-50"
          style={{
            background: 'rgba(18,18,31,0.7)',
            border: '1px solid #1e1e30',
            color: '#ededf5',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4" style={cardStyle}>
          <p style={{ color: '#9090a8', fontSize: 13 }}>Total Flagged Messages</p>
          <p style={{ color: '#ededf5', fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {stats?.jailbreakAttempts ?? '—'}
          </p>
        </div>
        <div className="p-4" style={cardStyle}>
          <p style={{ color: '#9090a8', fontSize: 13 }}>Jailbreak Attempts</p>
          <p style={{ color: '#f87171', fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {filteredEvents.filter(e => e.event_type === 'jailbreak_attempt').length || '—'}
          </p>
        </div>
        <div className="p-4" style={cardStyle}>
          <p style={{ color: '#9090a8', fontSize: 13 }}>Config Access Attempts</p>
          <p style={{ color: '#a78bfa', fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {filteredEvents.filter(e => e.event_type === 'config_access').length || '—'}
          </p>
        </div>
        <div className="p-4" style={cardStyle}>
          <p style={{ color: '#9090a8', fontSize: 13 }}>Patterns Monitored</p>
          <p style={{ color: '#4ade80', fontSize: 28, fontWeight: 700, marginTop: 4 }}>
            {stats?.patternsMonitored ?? 16}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm"
        >
          <option value="all">All Types</option>
          <option value="jailbreak_attempt">Jailbreak</option>
          <option value="prompt_injection">Prompt Injection</option>
          <option value="config_access">Config Access</option>
          <option value="suspicious_pattern">Suspicious</option>
        </select>
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-2.5 text-sm"
        >
          <option value="all">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="self-center" style={{ color: '#9090a8', fontSize: 13 }}>
          {filteredEvents.length} events
        </span>
      </div>

      {/* Events Table */}
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        {loading ? (
          <div className="p-12 text-center" style={{ color: '#9090a8' }}>
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading security events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center" style={{ color: '#9090a8' }}>
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p style={{ fontSize: 16, fontWeight: 500, color: '#ededf5' }}>No security events found</p>
            <p style={{ fontSize: 13, marginTop: 4, color: '#9090a8' }}>All clear — no suspicious patterns detected.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(9,9,15,0.8)', borderBottom: '1px solid #1e1e30' }}>
                {['Time', 'User', 'Type', 'Severity', 'Agent', 'Preview'].map(col => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left"
                    style={{ color: '#9090a8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <>
                  <tr
                    key={event.id}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: '1px solid rgba(30,30,48,0.5)', color: '#ededf5' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,30,48,0.4)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#9090a8', fontSize: 13 }}>
                      {new Date(event.created_at).toLocaleDateString()}{' '}
                      <span style={{ fontSize: 11 }}>{new Date(event.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#ededf5', fontSize: 13 }}>
                      {event.user_email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span style={typeStyle(event.event_type)}>
                        {typeLabel(event.event_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span style={severityStyle(event.severity)}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#9090a8', fontSize: 13 }}>
                      {event.agent_name || '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs" style={{ color: '#9090a8', fontSize: 13 }}>
                      <div className="flex items-center gap-1 truncate">
                        {expandedId === event.id
                          ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#4f6ef7' }} />
                          : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                        <span className="truncate">{event.content?.substring(0, 80)}</span>
                      </div>
                    </td>
                  </tr>
                  {expandedId === event.id && (
                    <tr key={`${event.id}-detail`} style={{ background: 'rgba(9,9,15,0.6)' }}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-2">
                          <p style={{ color: '#9090a8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Full Message Content
                          </p>
                          <pre
                            className="font-mono text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto p-3 rounded-lg"
                            style={{
                              background: 'rgba(18,18,31,0.7)',
                              border: '1px solid #1e1e30',
                              borderRadius: 12,
                              color: '#ededf5',
                              fontSize: 13,
                            }}
                          >
                            {event.content}
                          </pre>
                          <div className="flex gap-4 pt-1" style={{ color: '#9090a8', fontSize: 12 }}>
                            <span>User: {event.user_name || event.user_email}</span>
                            <span>Agent: {event.agent_name}</span>
                            <span>Conversation: {event.conversation_id?.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
