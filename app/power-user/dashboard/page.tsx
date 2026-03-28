'use client';

import { useState, useEffect } from 'react';
import { Users, Eye, MessageSquare, Clock, AlertCircle, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AssignedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  last_login: string | null;
  company: string | null;
  conversation_count: number;
}

interface ActiveTakeover {
  id: string;
  target_user_id: string;
  target_user_email: string;
  target_user_first_name: string | null;
  target_user_last_name: string | null;
  started_at: string;
  notes: string | null;
}

export default function PowerUserDashboard() {
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [activeTakeover, setActiveTakeover] = useState<ActiveTakeover | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTakeover, setStartingTakeover] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResponse, takeoverResponse] = await Promise.all([
        apiClient.get('/api/power-user/users'),
        apiClient.get('/api/power-user/takeover/active')
      ]);

      setUsers(usersResponse.users);
      setActiveTakeover(takeoverResponse.takeover);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTakeover = async (userId: string) => {
    const notes = prompt('Add coaching notes (optional):');
    if (notes === null) return; // User cancelled

    setStartingTakeover(userId);

    try {
      const response = await apiClient.post(`/api/power-user/takeover/${userId}`, {
        notes: notes || undefined
      });

      // Reload to show active takeover
      await loadData();

      // Navigate to the user's view (could redirect to their conversation page)
      alert('Takeover started! You can now view this user\'s session.');
    } catch (err: any) {
      console.error('Error starting takeover:', err);
      alert(`Failed to start takeover: ${err.message}`);
    } finally {
      setStartingTakeover(null);
    }
  };

  const handleEndTakeover = async () => {
    if (!activeTakeover || !confirm('End this coaching session?')) {
      return;
    }

    try {
      await apiClient.post(`/api/power-user/takeover/${activeTakeover.id}/end`, {});
      await loadData();
    } catch (err: any) {
      console.error('Error ending takeover:', err);
      alert(`Failed to end takeover: ${err.message}`);
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 60000);

    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
        </div>
        <p className="text-gray-600">Manage and support your assigned users</p>
      </div>

      {/* Active Takeover Banner */}
      {activeTakeover && (
        <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600 text-white p-3 rounded-lg">
                <Eye className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-1">
                  Active Coaching Session
                </h3>
                <p className="text-purple-700 mb-2">
                  Viewing session for:{' '}
                  <span className="font-medium">
                    {activeTakeover.target_user_first_name && activeTakeover.target_user_last_name
                      ? `${activeTakeover.target_user_first_name} ${activeTakeover.target_user_last_name}`
                      : activeTakeover.target_user_email}
                  </span>
                </p>
                <div className="flex items-center gap-4 text-sm text-purple-600">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>Duration: {formatDuration(activeTakeover.started_at)}</span>
                  </div>
                  {activeTakeover.notes && (
                    <span>Notes: {activeTakeover.notes}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleEndTakeover}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-gray-600">Total Users</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Total Conversations</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {users.reduce((sum, u) => sum + u.conversation_count, 0)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">Active Sessions</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {activeTakeover ? 1 : 0}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Assigned Users</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {users.map((user) => (
            <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.email}
                    </h3>
                    {activeTakeover?.target_user_id === user.id && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        <Eye className="h-3 w-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {user.company && (
                      <span>{user.company}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {user.conversation_count} conversations
                    </span>
                    <span>
                      Last login:{' '}
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartTakeover(user.id)}
                  disabled={
                    !!activeTakeover ||
                    startingTakeover === user.id
                  }
                  className="
                    flex items-center gap-2 px-4 py-2
                    bg-purple-600 text-white rounded-md
                    hover:bg-purple-700 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {startingTakeover === user.id ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      <span>Start Session</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No assigned users yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
