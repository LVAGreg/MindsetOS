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
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');

  useEffect(() => {
    fetchConsultants();
    // Set selected ID to current user on mount
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
    } catch (error) {
      console.error('Failed to fetch consultants:', error);
    }
  };

  const handleSelect = async (consultant: Consultant) => {
    setSelectedId(consultant.id);

    // Switch the active user in the app store
    setUser({
      id: consultant.id,
      email: consultant.email,
      name: `${consultant.first_name} ${consultant.last_name}`.trim(),
      firstName: consultant.first_name,
      lastName: consultant.last_name,
      role: 'user',
      emailVerified: true
    });

    // Close the panel
    setIsExpanded(false);

    // Force reload the page to refresh all data for new consultant
    window.location.reload();

    if (onSelectConsultant) {
      onSelectConsultant(consultant.id, consultant.email);
    }
  };

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();

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
      }
    } catch (error) {
      console.error('Failed to create consultant:', error);
    }
  };

  const handleClearMemories = async (consultantId: string) => {
    if (!confirm('Clear all memories for this consultant? This cannot be undone.')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants/${consultantId}/memories`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchConsultants();
        alert('Memories cleared successfully');
      }
    } catch (error) {
      console.error('Failed to clear memories:', error);
    }
  };

  const selectedConsultant = consultants.find(c => c.id === selectedId);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Collapsed Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all"
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">
            {selectedConsultant ? selectedConsultant.email : 'Select Consultant'}
          </span>
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-96 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h3 className="font-semibold">Admin: Consultant Selector</h3>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Consultant List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {consultants.map((consultant) => (
                <div
                  key={consultant.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedId === consultant.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                  onClick={() => handleSelect(consultant)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {consultant.first_name} {consultant.last_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {consultant.email}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                        <span>📊 {consultant.memory_count} memories</span>
                        <span>💬 {consultant.conversation_count} chats</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearMemories(consultant.id);
                      }}
                      className="ml-2 p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Clear all memories"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Consultant */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Create New Consultant
              </button>
            ) : (
              <form onSubmit={handleCreateConsultant} className="space-y-2">
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewEmail('');
                      setNewFirstName('');
                      setNewLastName('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Refresh Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <button
              onClick={fetchConsultants}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
