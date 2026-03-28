'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Plus, User, Check, Settings } from 'lucide-react';
import { useAppStore } from '../lib/store';
import type { ClientProfile } from '../lib/store';

const PROFILE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export function ClientProfileSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    user,
    viewAsUser,
    clientProfiles,
    activeClientProfileId,
    fetchClientProfiles,
    createClientProfile,
    setActiveClientProfile,
  } = useAppStore();

  const effectiveUser = viewAsUser || user;
  const isAgencyOrAdmin = effectiveUser?.role === 'agency' || effectiveUser?.role === 'admin';

  // Fetch profiles on mount, when role changes, or when viewAs user changes
  useEffect(() => {
    if (isAgencyOrAdmin) {
      fetchClientProfiles();
    }
  }, [isAgencyOrAdmin, fetchClientProfiles, viewAsUser?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Don't render for non-agency/admin users
  if (!isAgencyOrAdmin) return null;

  const activeProfile = clientProfiles.find(cp => cp.id === activeClientProfileId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const colorIdx = clientProfiles.length % PROFILE_COLORS.length;
      const profile = await createClientProfile({
        clientName: newName.trim(),
        industry: newIndustry.trim() || undefined,
        color: PROFILE_COLORS[colorIdx],
      });
      setActiveClientProfile(profile.id);
      setNewName('');
      setNewIndustry('');
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create client profile:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleSelect = (profileId: string | null) => {
    setActiveClientProfile(profileId);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all shadow-sm hover:shadow-md ${
          activeProfile
            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-300 dark:border-indigo-700'
            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600'
        }`}
      >
        {activeProfile ? (
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeProfile.color || '#3b82f6' }}
          />
        ) : (
          <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
        <div className="text-left">
          <div className="text-[10px] font-semibold uppercase tracking-wide leading-none text-indigo-600 dark:text-indigo-400">
            Client
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight max-w-[120px] truncate">
            {activeProfile?.clientName || 'My Business'}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Client Profiles</span>
            </div>
          </div>

          {/* Personal context option */}
          <div className="p-2">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                !activeClientProfileId
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <User className={`w-4 h-4 flex-shrink-0 ${!activeClientProfileId ? 'text-indigo-500' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${!activeClientProfileId ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                  My Business
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Personal context</div>
              </div>
              {!activeClientProfileId && <Check className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Client profile list */}
            {clientProfiles.map((cp) => (
              <button
                key={cp.id}
                onClick={() => handleSelect(cp.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeClientProfileId === cp.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cp.color || '#3b82f6' }}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${
                    activeClientProfileId === cp.id ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {cp.clientName}
                  </div>
                  {cp.industry && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{cp.industry}</div>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {cp.conversationCount}c
                </div>
                {activeClientProfileId === cp.id && <Check className="w-4 h-4 text-indigo-500" />}
              </button>
            ))}
          </div>

          {/* Create new client */}
          <div className="border-t border-gray-100 dark:border-gray-700 p-2">
            {showCreate ? (
              <div className="space-y-2 px-1">
                <input
                  type="text"
                  placeholder="Client name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Industry (optional)"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); setNewIndustry(''); }}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Client</span>
                </button>
                <button
                  onClick={() => { setOpen(false); router.push('/dashboard/clients'); }}
                  className="flex items-center gap-1 px-2 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Manage all clients"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
