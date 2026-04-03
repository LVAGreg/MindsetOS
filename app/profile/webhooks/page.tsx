'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight, Webhook, Copy, Check } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://mindset-os-backend-production.up.railway.app';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

interface UserWebhook {
  id: number;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
  trigger_count: number;
}

const AVAILABLE_EVENTS = [
  { value: 'conversation.completed', label: 'Conversation Completed', desc: 'Fires when an AI agent finishes a response' },
  { value: 'payment.received', label: 'Payment Received', desc: 'Fires when a new payment is processed' },
  { value: 'trial.started', label: 'Trial Started', desc: 'Fires when a user starts a free trial' },
  { value: 'memory.updated', label: 'Memory Updated', desc: 'Fires when a new memory is extracted' },
];

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<UserWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>(['conversation.completed']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/webhooks`, { headers: authHeaders() });
      if (res.status === 401) { router.push('/login'); return; }
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load webhooks.');
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newUrl.trim() || !newUrl.startsWith('http')) { setError('Enter a valid URL (http/https)'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/api/webhooks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents, secret: newSecret.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setNewUrl(''); setNewSecret(''); setNewEvents(['conversation.completed']); setShowForm(false);
      await load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this webhook?')) return;
    await fetch(`${API}/api/webhooks/${id}`, { method: 'DELETE', headers: authHeaders() });
    setWebhooks(w => w.filter(x => x.id !== id));
  }

  async function handleToggle(wh: UserWebhook) {
    await fetch(`${API}/api/webhooks/${wh.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ is_active: !wh.is_active }),
    });
    setWebhooks(w => w.map(x => x.id === wh.id ? { ...x, is_active: !x.is_active } : x));
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen" style={{ background: '#09090f' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors hover:opacity-80" style={{ color: '#9090a8' }}>
          <ArrowLeft className="w-4 h-4" /> ← Profile
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#ededf5' }}>
              <Webhook className="w-6 h-6 text-[#fcc824]" /> Webhooks
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9090a8' }}>Send MindsetOS events to your own tools (Zapier, Make, ActiveCampaign, etc.)</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setError(''); }}
              className="flex items-center gap-1.5 bg-[#fcc824] text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#e6b420] transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Webhook
            </button>
          )}
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-[#12121f] border border-[#1e1e30] rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: '#ededf5' }}>New Webhook</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: '#9090a8' }}>Endpoint URL</label>
                <input
                  type="url"
                  pattern="https?://.+"
                  placeholder="https://hooks.zapier.com/..."
                  value={newUrl}
                  onChange={e => { setNewUrl(e.target.value); if (error === 'Enter a valid URL (http/https)') setError(''); }}
                  onBlur={e => {
                    if (e.target.value && !/^https?:\/\/.+/.test(e.target.value)) {
                      setError('Enter a valid URL (http/https)');
                    }
                  }}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: '#9090a8' }}>Secret (optional — for HMAC signature)</label>
                <input
                  type="text"
                  placeholder="your-secret-key"
                  value={newSecret}
                  onChange={e => setNewSecret(e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-xs block mb-2" style={{ color: '#9090a8' }}>Events to receive</label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map(ev => (
                    <label key={ev.value} className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newEvents.includes(ev.value)}
                        onChange={e => setNewEvents(prev => e.target.checked ? [...prev, ev.value] : prev.filter(x => x !== ev.value))}
                        className="mt-0.5 accent-[#fcc824]"
                      />
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#ededf5' }}>{ev.label}</div>
                        <div className="text-xs" style={{ color: '#9090a8' }}>{ev.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={saving} className="bg-[#fcc824] text-black text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#e6b420] disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Webhook'}
                </button>
                <button onClick={() => { setShowForm(false); setError(''); }} className="text-sm px-4 py-2 hover:opacity-80 transition-opacity" style={{ color: '#9090a8' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook list */}
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: '#9090a8' }}>Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-16">
            <Webhook className="w-10 h-10 mx-auto mb-3" style={{ color: '#1e1e30' }} />
            <p className="text-sm" style={{ color: '#9090a8' }}>No webhooks yet.</p>
            <p className="text-xs mt-1" style={{ color: '#9090a8' }}>Add one to connect MindsetOS to Zapier, Make, or any tool.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className={`bg-[#12121f] border rounded-xl p-4 ${wh.is_active ? 'border-[#1e1e30]' : 'border-[#1e1e30] opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono truncate" style={{ color: '#ededf5' }}>{wh.url}</span>
                      <button onClick={() => copyUrl(wh.url)} className="flex-shrink-0 hover:opacity-80 transition-opacity" style={{ color: '#9090a8' }}>
                        {copied === wh.url ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {wh.events?.map(ev => (
                        <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(18,18,31,0.7)', color: '#9090a8', border: '1px solid #1e1e30' }}>{ev}</span>
                      ))}
                    </div>
                    <div className="text-xs" style={{ color: '#9090a8' }}>
                      {wh.trigger_count > 0 ? `Fired ${wh.trigger_count} times` : 'Never triggered'}{' '}
                      {wh.last_triggered_at && `· Last: ${new Date(wh.last_triggered_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleToggle(wh)} className="hover:opacity-80 transition-opacity" style={{ color: '#9090a8' }}>
                      {wh.is_active ? <ToggleRight className="w-5 h-5 text-[#fcc824]" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDelete(wh.id)} className="hover:opacity-80 transition-opacity" style={{ color: '#9090a8' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-[#12121f] border border-[#1e1e30] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#ededf5' }}>Payload format</h3>
          <pre className="text-xs rounded-xl p-3 overflow-x-auto" style={{ background: '#09090f', color: '#9090a8' }}>{`{
  "event": "conversation.completed",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "conversationId": "...",
    "agentId": "architecture-coach",
    "agentName": "Architecture Coach",
    "messageSummary": "..."
  }
}`}</pre>
          <p className="text-xs mt-3" style={{ color: '#9090a8' }}>
            If you set a secret, we'll include an <code style={{ color: '#ededf5' }}>X-MindsetOS-Signature</code> header (sha256 HMAC) for verification.
          </p>
        </div>
      </div>
    </div>
  );
}
