'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, AlertCircle, CheckCircle, Eye, Key, ArrowLeft, Building2, MessageSquare, Target, Briefcase, TrendingUp, RotateCcw, Pencil, X } from 'lucide-react';
import { RoleBadge, UserRole } from '@/components/RoleBadge';
import { apiClient } from '@/lib/api-client';

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  role_name: string;
  role_level: number;
  is_active: boolean;
  last_login: string | null;
  profile_image_url: string | null;
  bio: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  timezone: string | null;
  created_at: string;
}

interface TakeoverStatus {
  isTakenOver: boolean;
  takeover?: {
    power_user_email: string;
    power_user_first_name: string | null;
    power_user_last_name: string | null;
  };
}

interface CoreMemories {
  fullName: string;
  companyName: string;
  businessOutcome: string;
  targetClients: string;
  clientProblems: string[];
  clientResults: string;
  coreMethod: string;
  frameworks: string[];
  serviceDescription: string;
  pricingModel: string;
  deliveryTimeline: string;
  revenueRange: string;
  growthGoals: string;
  biggestChallenges: string[];
}

interface BrandVoice {
  isEnabled: boolean;
  tone: string;
  formalityLevel: string;
  sentenceStructure: string;
  vocabularyComplexity: string;
  usesContractions: boolean;
  usesEmojis: boolean;
  usesMetaphors: boolean;
  paragraphLength: string;
  voiceSummary: string;
  examplePhrases: string[];
  avoidPhrases: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [takeoverStatus, setTakeoverStatus] = useState<TakeoverStatus | null>(null);
  const [coreMemories, setCoreMemories] = useState<CoreMemories | null>(null);
  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coreMemoriesSuccess, setCoreMemoriesSuccess] = useState(false);
  const [brandVoiceSuccess, setBrandVoiceSuccess] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Core memories form state
  const [coreMemoriesData, setCoreMemoriesData] = useState<CoreMemories>({
    fullName: '',
    companyName: '',
    businessOutcome: '',
    targetClients: '',
    clientProblems: [],
    clientResults: '',
    coreMethod: '',
    frameworks: [],
    serviceDescription: '',
    pricingModel: '',
    deliveryTimeline: '',
    revenueRange: '',
    growthGoals: '',
    biggestChallenges: []
  });

  // Brand voice form state
  const [brandVoiceData, setBrandVoiceData] = useState<BrandVoice>({
    isEnabled: false,
    tone: '',
    formalityLevel: '',
    sentenceStructure: '',
    vocabularyComplexity: '',
    usesContractions: false,
    usesEmojis: false,
    usesMetaphors: false,
    paragraphLength: '',
    voiceSummary: '',
    examplePhrases: [],
    avoidPhrases: []
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/user/profile');
      setProfile(response);
      setTakeoverStatus({
        isTakenOver: response.isTakenOver || false,
        takeover: response.takeover || null
      });

      // Load core memories (onboarding data)
      try {
        const memories = await apiClient.get('/api/profile/core-memories');
        // API returns data directly with camelCase keys (via SQL aliases)
        setCoreMemories(memories);

        // Helper to ensure array fields are arrays
        const ensureArray = (val: any): string[] => {
          if (Array.isArray(val)) return val;
          if (typeof val === 'string' && val.trim()) return [val];
          return [];
        };

        // Route returns camelCase via SQL aliases
        setCoreMemoriesData({
          fullName: memories.fullName || '',
          companyName: memories.companyName || '',
          businessOutcome: memories.businessOutcome || '',
          targetClients: memories.targetClients || '',
          clientProblems: ensureArray(memories.clientProblems),
          clientResults: memories.clientResults || '',
          coreMethod: memories.coreMethod || '',
          frameworks: ensureArray(memories.frameworks),
          serviceDescription: memories.serviceDescription || '',
          pricingModel: memories.pricingModel || '',
          deliveryTimeline: memories.deliveryTimeline || '',
          revenueRange: memories.revenueRange || '',
          growthGoals: memories.growthGoals || '',
          biggestChallenges: ensureArray(memories.biggestChallenges)
        });
      } catch (coreMemErr: any) {
        // Core memories might not exist yet (user hasn't completed onboarding)
        console.log('Core memories not found (user may not have completed onboarding)');
      }

      // Load brand voice profile
      try {
        const brandVoiceResponse = await apiClient.get('/api/brand-voice/profile');
        if (brandVoiceResponse) {
          setBrandVoice(brandVoiceResponse);
          setBrandVoiceData({
            isEnabled: brandVoiceResponse.isEnabled || false,
            tone: brandVoiceResponse.tone || '',
            formalityLevel: brandVoiceResponse.formalityLevel || '',
            sentenceStructure: brandVoiceResponse.sentenceStructure || '',
            vocabularyComplexity: brandVoiceResponse.vocabularyComplexity || '',
            usesContractions: brandVoiceResponse.usesContractions || false,
            usesEmojis: brandVoiceResponse.usesEmojis || false,
            usesMetaphors: brandVoiceResponse.usesMetaphors || false,
            paragraphLength: brandVoiceResponse.paragraphLength || '',
            voiceSummary: brandVoiceResponse.voiceSummary || '',
            examplePhrases: brandVoiceResponse.examplePhrases || [],
            avoidPhrases: brandVoiceResponse.avoidPhrases || []
          });
        }
      } catch (brandVoiceErr: any) {
        // Brand voice might not exist yet
        console.log('Brand voice not found (user may not have analyzed their voice yet)');
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCoreMemoryChange = (field: keyof CoreMemories, value: string | string[]) => {
    setCoreMemoriesData(prev => ({ ...prev, [field]: value }));
  };

  // Handler for array fields (converts comma-separated input to array)
  const handleArrayFieldChange = (field: 'clientProblems' | 'frameworks' | 'biggestChallenges', value: string) => {
    const arrayValue = value.split(',').map(s => s.trim()).filter(s => s);
    setCoreMemoriesData(prev => ({ ...prev, [field]: arrayValue }));
  };

  const handleSaveCoreMemories = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCoreMemoriesSuccess(false);

    try {
      // API expects camelCase keys
      await apiClient.put('/api/profile/core-memories', coreMemoriesData);
      setCoreMemoriesSuccess(true);
      await loadProfile();

      // Clear success message after 3 seconds
      setTimeout(() => setCoreMemoriesSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating core memories:', err);
      setError(err.message || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  const handleBrandVoiceChange = (field: keyof BrandVoice, value: string | boolean | string[]) => {
    setBrandVoiceData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBrandVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setBrandVoiceSuccess(false);

    try {
      await apiClient.put('/api/brand-voice/profile', brandVoiceData);
      setBrandVoiceSuccess(true);
      await loadProfile();

      // Clear success message after 3 seconds
      setTimeout(() => setBrandVoiceSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error updating brand voice:', err);
      setError(err.message || 'Failed to update brand voice profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setError(null);
    try {
      await apiClient.put('/api/user/profile', {
        name: `${profileForm.firstName} ${profileForm.lastName}`.trim(),
        email: profileForm.email,
      });
      setProfileSuccess(true);
      setEditingProfile(false);
      setTimeout(() => setProfileSuccess(false), 3000);
      loadProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetMemory = async () => {
    setResetting(true);
    setError(null);
    try {
      await apiClient.delete('/api/profile/reset-memory');
      setResetSuccess(true);
      setResetConfirmOpen(false);
      setCoreMemoriesData({
        fullName: '', companyName: '', businessOutcome: '', targetClients: '',
        clientProblems: [], clientResults: '', coreMethod: '', frameworks: [],
        serviceDescription: '', pricingModel: '', deliveryTimeline: '',
        revenueRange: '', growthGoals: '', biggestChallenges: []
      });
      setBrandVoiceData({
        isEnabled: false, tone: '', formalityLevel: '', sentenceStructure: '',
        vocabularyComplexity: '', usesContractions: false, usesEmojis: false,
        usesMetaphors: false, paragraphLength: '', voiceSummary: '',
        examplePhrases: [], avoidPhrases: []
      });
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset memory');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 pt-6 pb-8">

        {/* Takeover Notice */}
        {takeoverStatus?.isTakenOver && takeoverStatus.takeover && (
          <div className="bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Coach is Helping You</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {takeoverStatus.takeover.power_user_first_name && takeoverStatus.takeover.power_user_last_name
                    ? `${takeoverStatus.takeover.power_user_first_name} ${takeoverStatus.takeover.power_user_last_name}`
                    : takeoverStatus.takeover.power_user_email}
                  {' '}is currently viewing your session
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl mb-6">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Card & Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Profile Card */}
          <div
            className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
            style={{ borderColor: '#8B5CF640', background: 'linear-gradient(135deg, #8B5CF608, #8B5CF603)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {coreMemoriesData.fullName?.[0] || profile.first_name?.[0] || profile.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {editingProfile ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        placeholder="First name"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        placeholder="Last name"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Email address"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="px-3 py-1.5 text-sm font-medium text-black rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#fcc824' }}
                      >
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                        {coreMemoriesData.fullName || (profile.first_name && profile.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : profile.email)}
                      </h2>
                      <button
                        onClick={() => {
                          setProfileForm({
                            firstName: profile.first_name || '',
                            lastName: profile.last_name || '',
                            email: profile.email,
                          });
                          setEditingProfile(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Edit profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {profileSuccess && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <RoleBadge role={profile.role} />
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          profile.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{profile.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div
            className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
            style={{ borderColor: '#F59E0B40', background: 'linear-gradient(135deg, #F59E0B08, #F59E0B03)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/profile/reset-password')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl transition-colors"
              >
                <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Reset Password</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Change your account password</div>
                </div>
              </button>

              {/* Reset Memory */}
              {resetSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-green-700 dark:text-green-300 text-sm">Memory reset successfully. Your agents are still unlocked.</span>
                </div>
              )}

              {!resetConfirmOpen ? (
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl transition-colors"
                >
                  <RotateCcw className="h-5 w-5 text-red-500 dark:text-red-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Reset Memory</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Clear all data and start fresh</div>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">This will permanently clear:</p>
                  <ul className="text-red-600 dark:text-red-400 text-xs mb-3 space-y-1 ml-4 list-disc">
                    <li>Business profile (clients, outcomes, method)</li>
                    <li>Brand voice settings and document chunks</li>
                    <li>Agent memory of your previous work</li>
                  </ul>
                  <p className="text-red-600/70 dark:text-red-400/70 text-xs mt-1">Your conversations, playbooks, and usage history are kept.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResetMemory}
                      disabled={resetting}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
                    </button>
                    <button
                      onClick={() => setResetConfirmOpen(false)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Profile Cards Grid - Always show, populated from onboarding if available */}
        <form onSubmit={handleSaveCoreMemories}>
            {/* Success Message */}
            {coreMemoriesSuccess && (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl mb-6">
                <CheckCircle className="h-5 w-5" />
                <span>Business profile updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Business Overview Card */}
              <div
                className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
                style={{ borderColor: '#3B82F640', background: 'linear-gradient(135deg, #3B82F608, #3B82F603)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-blue-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Overview</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={coreMemoriesData.fullName}
                      onChange={(e) => handleCoreMemoryChange('fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={coreMemoriesData.companyName}
                      onChange={(e) => handleCoreMemoryChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Outcome</label>
                    <textarea
                      value={coreMemoriesData.businessOutcome}
                      onChange={(e) => handleCoreMemoryChange('businessOutcome', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What outcome do you help clients achieve?"
                    />
                  </div>
                </div>
              </div>

              {/* Client Focus Card */}
              <div
                className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
                style={{ borderColor: '#10B98140', background: 'linear-gradient(135deg, #10B98108, #10B98103)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Client Focus</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Clients</label>
                    <textarea
                      value={coreMemoriesData.targetClients}
                      onChange={(e) => handleCoreMemoryChange('targetClients', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Who are your ideal clients?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Problems</label>
                    {coreMemoriesData.clientProblems.length > 0 ? (
                      <ul className="space-y-1 mb-2">
                        {coreMemoriesData.clientProblems.map((problem, idx) => (
                          <li key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                            {problem}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.clientProblems.join(', ')}
                      onChange={(e) => handleArrayFieldChange('clientProblems', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Comma-separated list of problems"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Results</label>
                    <textarea
                      value={coreMemoriesData.clientResults}
                      onChange={(e) => handleCoreMemoryChange('clientResults', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="What results do they get?"
                    />
                  </div>
                </div>
              </div>

              {/* Methodology Card */}
              <div
                className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
                style={{ borderColor: '#EC489940', background: 'linear-gradient(135deg, #EC489908, #EC489903)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6 text-pink-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Methodology</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Core Method</label>
                    <textarea
                      value={coreMemoriesData.coreMethod}
                      onChange={(e) => handleCoreMemoryChange('coreMethod', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Your core methodology"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frameworks</label>
                    {coreMemoriesData.frameworks.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {coreMemoriesData.frameworks.map((framework, idx) => (
                          <span key={idx} className="inline-flex items-center px-3 py-1 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 rounded-full text-sm text-pink-800 dark:text-pink-200">
                            {framework}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.frameworks.join(', ')}
                      onChange={(e) => handleArrayFieldChange('frameworks', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      placeholder="Comma-separated list of frameworks"
                    />
                  </div>
                </div>
              </div>

              {/* Services Card */}
              <div
                className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
                style={{ borderColor: '#8B5CF640', background: 'linear-gradient(135deg, #8B5CF608, #8B5CF603)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6 text-violet-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Services</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Description</label>
                    <textarea
                      value={coreMemoriesData.serviceDescription}
                      onChange={(e) => handleCoreMemoryChange('serviceDescription', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Describe your services"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pricing Model</label>
                    <input
                      type="text"
                      value={coreMemoriesData.pricingModel}
                      onChange={(e) => handleCoreMemoryChange('pricingModel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="e.g., Retainer, project-based"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Timeline</label>
                    <input
                      type="text"
                      value={coreMemoriesData.deliveryTimeline}
                      onChange={(e) => handleCoreMemoryChange('deliveryTimeline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="e.g., 90 days"
                    />
                  </div>
                </div>
              </div>

              {/* Business Goals Card */}
              <div
                className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md md:col-span-2 lg:col-span-2"
                style={{ borderColor: '#F59E0B40', background: 'linear-gradient(135deg, #F59E0B08, #F59E0B03)' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Goals</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Revenue Range</label>
                    <input
                      type="text"
                      value={coreMemoriesData.revenueRange}
                      onChange={(e) => handleCoreMemoryChange('revenueRange', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="e.g., $10k-$30k/month"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Growth Goals</label>
                    <textarea
                      value={coreMemoriesData.growthGoals}
                      onChange={(e) => handleCoreMemoryChange('growthGoals', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Your growth goals"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biggest Challenges</label>
                    {coreMemoriesData.biggestChallenges.length > 0 ? (
                      <ul className="space-y-1 mb-2">
                        {coreMemoriesData.biggestChallenges.map((challenge, idx) => (
                          <li key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.biggestChallenges.join(', ')}
                      onChange={(e) => handleArrayFieldChange('biggestChallenges', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      placeholder="Comma-separated list of challenges"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Business Profile Button */}
            <div className="flex justify-end mb-8">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Business Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>

        {/* Brand Voice Profile Card - Available for power_user, agency, admin */}
        {profile && ['power_user', 'agency', 'admin'].includes(profile.role) && <div
          className="p-6 rounded-2xl border-2 bg-white dark:bg-gray-800 shadow-md"
          style={{ borderColor: '#6366F140', background: 'linear-gradient(135deg, #6366F108, #6366F103)' }}
        >
          <form onSubmit={handleSaveBrandVoice}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Brand Voice Profile</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Define your unique communication style and preferences
                  </p>
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <label className="flex items-center space-x-3 cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {brandVoiceData.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.isEnabled}
                    onChange={(e) => handleBrandVoiceChange('isEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-purple-600 transition-colors"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>
            </div>

            {/* Success Message */}
            {brandVoiceSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl mb-4">
                <CheckCircle className="h-5 w-5" />
                <span>Brand voice updated successfully!</span>
              </div>
            )}

            {!brandVoiceData.isEnabled && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Brand voice is currently disabled. Agents will not use your custom voice settings. Enable it above to activate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tone</label>
                <select
                  value={brandVoiceData.tone}
                  onChange={(e) => handleBrandVoiceChange('tone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select tone...</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="warm">Warm</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              {/* Formality Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Formality Level</label>
                <select
                  value={brandVoiceData.formalityLevel}
                  onChange={(e) => handleBrandVoiceChange('formalityLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select formality...</option>
                  <option value="formal">Formal</option>
                  <option value="semi-formal">Semi-Formal</option>
                  <option value="informal">Informal</option>
                </select>
              </div>

              {/* Sentence Structure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sentence Structure</label>
                <select
                  value={brandVoiceData.sentenceStructure}
                  onChange={(e) => handleBrandVoiceChange('sentenceStructure', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select structure...</option>
                  <option value="short">Short & Punchy</option>
                  <option value="varied">Varied</option>
                  <option value="complex">Complex</option>
                </select>
              </div>

              {/* Vocabulary Complexity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vocabulary Complexity</label>
                <select
                  value={brandVoiceData.vocabularyComplexity}
                  onChange={(e) => handleBrandVoiceChange('vocabularyComplexity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select complexity...</option>
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Paragraph Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paragraph Length</label>
                <select
                  value={brandVoiceData.paragraphLength}
                  onChange={(e) => handleBrandVoiceChange('paragraphLength', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select length...</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>

              {/* Writing Style Toggles */}
              <div className="flex flex-col justify-center space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.usesContractions}
                    onChange={(e) => handleBrandVoiceChange('usesContractions', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Uses Contractions</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.usesEmojis}
                    onChange={(e) => handleBrandVoiceChange('usesEmojis', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Uses Emojis</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.usesMetaphors}
                    onChange={(e) => handleBrandVoiceChange('usesMetaphors', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Uses Metaphors</span>
                </label>
              </div>
            </div>

            {/* Voice Summary */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Voice Summary</label>
              <textarea
                value={brandVoiceData.voiceSummary}
                onChange={(e) => handleBrandVoiceChange('voiceSummary', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description of your unique writing style and voice..."
              />
            </div>

            {/* Example & Avoid Phrases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Example Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={brandVoiceData.examplePhrases.join(', ')}
                  onChange={(e) => handleBrandVoiceChange('examplePhrases', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Common phrases you use"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avoid Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={brandVoiceData.avoidPhrases.join(', ')}
                  onChange={(e) => handleBrandVoiceChange('avoidPhrases', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Phrases you never use"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Brand Voice</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>}



      </div>
    </div>
  );
}
