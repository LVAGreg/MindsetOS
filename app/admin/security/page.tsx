'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

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

export default function SecurityPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
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
    } catch (e) {
      console.error('Failed to fetch security data:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredEvents = events.filter(e => {
    if (filterType !== 'all' && e.event_type !== filterType) return false;
    if (filterSeverity !== 'all' && e.severity !== filterSeverity) return false;
    return true;
  });

  const severityColor = (s: string) => {
    switch (s) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  const typeColor = (t: string) => {
    switch (t) {
      case 'jailbreak_attempt': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'prompt_injection': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'config_access': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'suspicious_pattern': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Monitor</h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Flagged Messages</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.jailbreakAttempts ?? '—'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Jailbreak Attempts</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">
            {filteredEvents.filter(e => e.event_type === 'jailbreak_attempt').length || '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Config Access Attempts</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {filteredEvents.filter(e => e.event_type === 'config_access').length || '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Patterns Monitored</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.patternsMonitored ?? 16}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
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
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300"
        >
          <option value="all">All Severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
          {filteredEvents.length} events
        </span>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading security events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No security events found</p>
            <p className="text-sm mt-1">All clear — no suspicious patterns detected.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                >
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleDateString()}{' '}
                    <span className="text-xs">{new Date(event.created_at).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                    {event.user_email || 'Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor(event.event_type)}`}>
                      {typeLabel(event.event_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${severityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {event.agent_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      {expandedId === event.id ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
                      <span className="truncate">{event.content?.substring(0, 80)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {/* Expanded detail row */}
              {filteredEvents.map((event) => expandedId === event.id && (
                <tr key={`${event.id}-detail`} className="bg-gray-50 dark:bg-gray-900">
                  <td colSpan={6} className="px-6 py-4">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">Full Message Content</p>
                      <pre className="text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
                        {event.content}
                      </pre>
                      <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                        <span>User: {event.user_name || event.user_email}</span>
                        <span>Agent: {event.agent_name}</span>
                        <span>Conversation: {event.conversation_id?.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
