'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Save, AlertCircle, CheckCircle, Eye, Key, ArrowLeft, Building2, MessageSquare, Target, Briefcase, TrendingUp, RotateCcw, Pencil, X, Webhook } from 'lucide-react';
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

  // BYOK state
  const [tokenUsage, setTokenUsage] = useState<{ quota: number; used: number; pct_used: number; resets_at: string | null; byok_enabled: boolean } | null>(null);
  const [byokKey, setByokKey] = useState('');
  const [byokEnabled, setByokEnabled] = useState(false);
  const [savingByok, setSavingByok] = useState(false);
  const [byokSuccess, setByokSuccess] = useState(false);
  const [byokError, setByokError] = useState<string | null>(null);
  const [showByokKey, setShowByokKey] = useState(false);

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

      // Load token usage + BYOK
      try {
        const tu = await apiClient.get('/api/tokens/usage');
        setTokenUsage(tu);
        setByokEnabled(tu.byok_enabled || false);
      } catch {
        // Table may not exist yet (pre-migration)
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

  const handleSaveByok = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingByok(true);
    setByokError(null);
    setByokSuccess(false);
    try {
      const payload: Record<string, unknown> = { byok_enabled: byokEnabled };
      if (byokKey.trim()) payload.openrouter_api_key = byokKey.trim();
      await apiClient.post('/api/tokens/byok', payload);
      setByokSuccess(true);
      setByokKey('');
      // Reload token usage to reflect new state
      const tu = await apiClient.get('/api/tokens/usage');
      setTokenUsage(tu);
      setByokEnabled(tu.byok_enabled || false);
      setTimeout(() => setByokSuccess(false), 3000);
    } catch (err: any) {
      setByokError(err.message || 'Failed to save API key');
    } finally {
      setSavingByok(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-8" style={{ background: '#09090f' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-[#4f6ef7] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="h-full overflow-y-auto p-4 sm:p-8" style={{ background: '#09090f' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
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
    <div className="h-full overflow-y-auto relative" style={{ background: '#09090f' }}>
      {/* Ambient orbs */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(79,110,247,0.08) 0%, transparent 70%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 80% 80%, rgba(139,92,246,0.07) 0%, transparent 70%)' }} />

      {/* Page Header */}
      <div className="relative z-10 px-4 sm:px-8 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: '#9090a8' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <h1 className="text-3xl font-bold" style={{ color: '#ededf5' }}>Profile</h1>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-2 pb-8">

        {/* Takeover Notice */}
        {takeoverStatus?.isTakenOver && takeoverStatus.takeover && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(79,110,247,0.1)', border: '2px solid rgba(79,110,247,0.3)' }}>
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" style={{ color: '#4f6ef7' }} />
              <div>
                <h3 className="font-semibold" style={{ color: '#ededf5' }}>Your Mindset Coach</h3>
                <p className="text-sm" style={{ color: '#9090a8' }}>
                  {takeoverStatus.takeover.power_user_first_name && takeoverStatus.takeover.power_user_last_name
                    ? `${takeoverStatus.takeover.power_user_first_name} ${takeoverStatus.takeover.power_user_last_name}`
                    : takeoverStatus.takeover.power_user_email}
                  {' '}is currently supporting your session
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Card & Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Profile Card */}
          <div
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
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
                        className="flex-1 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      />
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        placeholder="Last name"
                        className="flex-1 bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      />
                    </div>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Email address"
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 text-sm placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-50 text-sm"
                      >
                        {savingProfile ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="px-4 py-2 text-sm font-medium rounded-xl transition-colors"
                        style={{ color: '#9090a8' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold truncate" style={{ color: '#ededf5' }}>
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
                        className="p-1 transition-colors"
                        style={{ color: '#9090a8' }}
                        title="Edit profile"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {profileSuccess && (
                        <span className="text-xs flex items-center gap-1" style={{ color: '#4ade80' }}>
                          <CheckCircle className="w-3 h-3" /> Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <RoleBadge role={profile.role} />
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={profile.is_active
                          ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
                          : { background: 'rgba(144,144,168,0.1)', color: '#9090a8', border: '1px solid rgba(144,144,168,0.3)' }
                        }
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm mt-2 truncate" style={{ color: '#9090a8' }}>{profile.email}</p>
                    <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                      Member since {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div
            className="p-6 rounded-2xl"
            style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-6 w-6" style={{ color: '#9090a8' }} />
              <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/profile/reset-password')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{ background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.2)' }}
              >
                <Key className="h-5 w-5" style={{ color: '#4f6ef7' }} />
                <div className="text-left">
                  <div className="font-medium" style={{ color: '#ededf5' }}>Reset Password</div>
                  <div className="text-sm" style={{ color: '#9090a8' }}>Change your account password</div>
                </div>
              </button>

              <button
                onClick={() => router.push('/profile/webhooks')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
              >
                <Webhook className="h-5 w-5" style={{ color: '#8b5cf6' }} />
                <div className="text-left">
                  <div className="font-medium" style={{ color: '#ededf5' }}>Webhooks</div>
                  <div className="text-sm" style={{ color: '#9090a8' }}>Connect MindsetOS to Zapier, Make, or any tool</div>
                </div>
              </button>

              {/* Reset Memory */}
              {resetSuccess && (
                <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)' }}>
                  <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#4ade80' }} />
                  <span className="text-sm" style={{ color: '#4ade80' }}>Memory reset successfully. Your agents are still unlocked.</span>
                </div>
              )}

              {!resetConfirmOpen ? (
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <RotateCcw className="h-5 w-5" style={{ color: '#f87171' }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: '#ededf5' }}>Reset Memory</div>
                    <div className="text-sm" style={{ color: '#9090a8' }}>Clear all data and start fresh</div>
                  </div>
                </button>
              ) : (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <p className="text-sm font-medium mb-2" style={{ color: '#f87171' }}>This will permanently clear:</p>
                  <ul className="text-xs mb-3 space-y-1 ml-4 list-disc" style={{ color: '#f87171' }}>
                    <li>Business profile (clients, outcomes, method)</li>
                    <li>Brand voice settings and document chunks</li>
                    <li>Agent memory of your previous work</li>
                  </ul>
                  <p className="text-xs mt-1" style={{ color: 'rgba(248,113,113,0.7)' }}>Your conversations, playbooks, and usage history are kept.</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleResetMemory}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
                    >
                      {resetting ? 'Resetting...' : 'Yes, Reset Everything'}
                    </button>
                    <button
                      onClick={() => setResetConfirmOpen(false)}
                      className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                      style={{ background: 'rgba(144,144,168,0.1)', border: '1px solid #1e1e30', color: '#9090a8' }}
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
              <div className="flex items-center gap-2 p-4 rounded-2xl mb-6" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                <CheckCircle className="h-5 w-5" />
                <span>Business profile updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Business Overview Card */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6" style={{ color: '#4f6ef7' }} />
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Business Overview</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Full Name</label>
                    <input
                      type="text"
                      value={coreMemoriesData.fullName}
                      onChange={(e) => handleCoreMemoryChange('fullName', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Company Name</label>
                    <input
                      type="text"
                      value={coreMemoriesData.companyName}
                      onChange={(e) => handleCoreMemoryChange('companyName', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Business Outcome</label>
                    <textarea
                      value={coreMemoriesData.businessOutcome}
                      onChange={(e) => handleCoreMemoryChange('businessOutcome', e.target.value)}
                      rows={3}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="What outcome do you help clients achieve?"
                    />
                  </div>
                </div>
              </div>

              {/* Client Focus Card */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Target className="h-6 w-6" style={{ color: '#10b981' }} />
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Your Audience</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Who You Serve</label>
                    <textarea
                      value={coreMemoriesData.targetClients}
                      onChange={(e) => handleCoreMemoryChange('targetClients', e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Who are your ideal clients?"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Problems You Solve</label>
                    {coreMemoriesData.clientProblems.length > 0 ? (
                      <ul className="space-y-1 mb-2">
                        {coreMemoriesData.clientProblems.map((problem, idx) => (
                          <li key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#ededf5' }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#10b981' }} />
                            {problem}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.clientProblems.join(', ')}
                      onChange={(e) => handleArrayFieldChange('clientProblems', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm"
                      placeholder="Comma-separated list of problems"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Results You Create</label>
                    <textarea
                      value={coreMemoriesData.clientResults}
                      onChange={(e) => handleCoreMemoryChange('clientResults', e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="What results do they get?"
                    />
                  </div>
                </div>
              </div>

              {/* Methodology Card */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6" style={{ color: '#ec4899' }} />
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Your Approach</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Your Method</label>
                    <textarea
                      value={coreMemoriesData.coreMethod}
                      onChange={(e) => handleCoreMemoryChange('coreMethod', e.target.value)}
                      rows={3}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Your core methodology"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Frameworks</label>
                    {coreMemoriesData.frameworks.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {coreMemoriesData.frameworks.map((framework, idx) => (
                          <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)', color: '#f9a8d4' }}>
                            {framework}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.frameworks.join(', ')}
                      onChange={(e) => handleArrayFieldChange('frameworks', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm"
                      placeholder="Comma-separated list of frameworks"
                    />
                  </div>
                </div>
              </div>

              {/* Services Card */}
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Briefcase className="h-6 w-6" style={{ color: '#8b5cf6' }} />
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Your Business</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>What You Offer</label>
                    <textarea
                      value={coreMemoriesData.serviceDescription}
                      onChange={(e) => handleCoreMemoryChange('serviceDescription', e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Describe your services"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Pricing Model</label>
                    <input
                      type="text"
                      value={coreMemoriesData.pricingModel}
                      onChange={(e) => handleCoreMemoryChange('pricingModel', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="e.g., Retainer, project-based"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Delivery Timeline</label>
                    <input
                      type="text"
                      value={coreMemoriesData.deliveryTimeline}
                      onChange={(e) => handleCoreMemoryChange('deliveryTimeline', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="e.g., 90 days"
                    />
                  </div>
                </div>
              </div>

              {/* Business Goals Card */}
              <div
                className="p-6 rounded-2xl md:col-span-2 lg:col-span-2"
                style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6" style={{ color: '#f59e0b' }} />
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Business Goals</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Revenue Range</label>
                    <input
                      type="text"
                      value={coreMemoriesData.revenueRange}
                      onChange={(e) => handleCoreMemoryChange('revenueRange', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="e.g., $10k-$30k/month"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Growth Goals</label>
                    <textarea
                      value={coreMemoriesData.growthGoals}
                      onChange={(e) => handleCoreMemoryChange('growthGoals', e.target.value)}
                      rows={2}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                      placeholder="Your growth goals"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Biggest Challenges</label>
                    {coreMemoriesData.biggestChallenges.length > 0 ? (
                      <ul className="space-y-1 mb-2">
                        {coreMemoriesData.biggestChallenges.map((challenge, idx) => (
                          <li key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#ededf5' }}>
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f59e0b' }} />
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <input
                      type="text"
                      value={coreMemoriesData.biggestChallenges.join(', ')}
                      onChange={(e) => handleArrayFieldChange('biggestChallenges', e.target.value)}
                      className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7] text-sm"
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
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
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
          className="p-6 rounded-2xl"
          style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}
        >
          <form onSubmit={handleSaveBrandVoice}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6" style={{ color: '#6366f1' }} />
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: '#ededf5' }}>Brand Voice Profile</h3>
                  <p className="text-sm" style={{ color: '#9090a8' }}>
                    Define your unique communication style and preferences
                  </p>
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <label className="flex items-center space-x-3 cursor-pointer self-start sm:self-auto">
                <span className="text-sm font-medium" style={{ color: '#9090a8' }}>
                  {brandVoiceData.isEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.isEnabled}
                    onChange={(e) => handleBrandVoiceChange('isEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full peer-checked:bg-[#4f6ef7] transition-colors" style={{ background: '#1e1e30' }}></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
              </label>
            </div>

            {/* Success Message */}
            {brandVoiceSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                <CheckCircle className="h-5 w-5" />
                <span>Brand voice updated successfully!</span>
              </div>
            )}

            {!brandVoiceData.isEnabled && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="text-sm" style={{ color: '#fbbf24' }}>
                  Brand voice is currently disabled. Agents will not use your custom voice settings. Enable it above to activate.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tone */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Tone</label>
                <select
                  value={brandVoiceData.tone}
                  onChange={(e) => handleBrandVoiceChange('tone', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
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
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Formality Level</label>
                <select
                  value={brandVoiceData.formalityLevel}
                  onChange={(e) => handleBrandVoiceChange('formalityLevel', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  <option value="">Select formality...</option>
                  <option value="formal">Formal</option>
                  <option value="semi-formal">Semi-Formal</option>
                  <option value="informal">Informal</option>
                </select>
              </div>

              {/* Sentence Structure */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Sentence Structure</label>
                <select
                  value={brandVoiceData.sentenceStructure}
                  onChange={(e) => handleBrandVoiceChange('sentenceStructure', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  <option value="">Select structure...</option>
                  <option value="short">Short & Punchy</option>
                  <option value="varied">Varied</option>
                  <option value="complex">Complex</option>
                </select>
              </div>

              {/* Vocabulary Complexity */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Vocabulary Complexity</label>
                <select
                  value={brandVoiceData.vocabularyComplexity}
                  onChange={(e) => handleBrandVoiceChange('vocabularyComplexity', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                >
                  <option value="">Select complexity...</option>
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Paragraph Length */}
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Paragraph Length</label>
                <select
                  value={brandVoiceData.paragraphLength}
                  onChange={(e) => handleBrandVoiceChange('paragraphLength', e.target.value)}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
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
                    className="w-4 h-4 rounded border-[#1e1e30] bg-[#09090f] accent-[#4f6ef7]"
                  />
                  <span className="text-sm" style={{ color: '#9090a8' }}>Uses Contractions</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.usesEmojis}
                    onChange={(e) => handleBrandVoiceChange('usesEmojis', e.target.checked)}
                    className="w-4 h-4 rounded border-[#1e1e30] bg-[#09090f] accent-[#4f6ef7]"
                  />
                  <span className="text-sm" style={{ color: '#9090a8' }}>Uses Emojis</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandVoiceData.usesMetaphors}
                    onChange={(e) => handleBrandVoiceChange('usesMetaphors', e.target.checked)}
                    className="w-4 h-4 rounded border-[#1e1e30] bg-[#09090f] accent-[#4f6ef7]"
                  />
                  <span className="text-sm" style={{ color: '#9090a8' }}>Uses Metaphors</span>
                </label>
              </div>
            </div>

            {/* Voice Summary */}
            <div className="mt-4">
              <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Voice Summary</label>
              <textarea
                value={brandVoiceData.voiceSummary}
                onChange={(e) => handleBrandVoiceChange('voiceSummary', e.target.value)}
                rows={2}
                className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                placeholder="Brief description of your unique writing style and voice..."
              />
            </div>

            {/* Example & Avoid Phrases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Example Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={brandVoiceData.examplePhrases.join(', ')}
                  onChange={(e) => handleBrandVoiceChange('examplePhrases', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  placeholder="Common phrases you use"
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>Avoid Phrases (comma-separated)</label>
                <input
                  type="text"
                  value={brandVoiceData.avoidPhrases.join(', ')}
                  onChange={(e) => handleBrandVoiceChange('avoidPhrases', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                  className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  placeholder="Phrases you never use"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
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

        {/* Token Usage + BYOK Card */}
        {tokenUsage && (
          <div className="rounded-xl p-6 mt-6" style={{ background: 'rgba(18,18,31,0.7)', border: '1px solid #1e1e30' }}>
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5" style={{ color: '#4f6ef7' }} />
              <h2 className="text-lg font-semibold" style={{ color: '#ededf5' }}>AI Usage &amp; API Key</h2>
            </div>

            {/* Usage bar */}
            {!tokenUsage.byok_enabled && (
              <div className="mb-5">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span style={{ color: '#9090a8' }}>Monthly tokens used</span>
                  <span className="font-medium" style={{ color: '#ededf5' }}>
                    {tokenUsage.used.toLocaleString()} / {tokenUsage.quota.toLocaleString()}
                  </span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: '#1e1e30' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(tokenUsage.pct_used, 100)}%`,
                      background: tokenUsage.pct_used >= 90 ? '#ef4444' : tokenUsage.pct_used >= 70 ? '#f59e0b' : '#4f6ef7'
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                  {tokenUsage.pct_used}% used
                  {tokenUsage.resets_at && ` · Resets ${new Date(tokenUsage.resets_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              </div>
            )}

            {tokenUsage.byok_enabled && (
              <div className="mb-5 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Using your own OpenRouter API key — no monthly token limit
              </div>
            )}

            {/* BYOK form */}
            <form onSubmit={handleSaveByok} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#9090a8' }}>
                  Your OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type={showByokKey ? 'text' : 'password'}
                    value={byokKey}
                    onChange={e => setByokKey(e.target.value)}
                    placeholder="sk-or-v1-••••••••••••••••"
                    className="w-full bg-[#09090f] border border-[#1e1e30] text-[#ededf5] rounded-xl px-4 py-3 pr-10 text-sm placeholder:text-[#9090a8]/60 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7]/40 focus:border-[#4f6ef7]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowByokKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9090a8' }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: '#9090a8' }}>
                  Get your key at <span className="font-mono">openrouter.ai/settings/keys</span>. Your key is stored encrypted and never shared.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={byokEnabled}
                    onChange={e => setByokEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 rounded-full peer-checked:bg-[#4f6ef7] transition-colors" style={{ background: '#1e1e30' }}></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className="text-sm" style={{ color: '#9090a8' }}>Use my own API key (removes monthly token limit)</span>
              </label>

              {byokError && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#f87171' }}>
                  <AlertCircle className="w-4 h-4" /> {byokError}
                </div>
              )}
              {byokSuccess && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#4ade80' }}>
                  <CheckCircle className="w-4 h-4" /> Saved
                </div>
              )}

              <button
                type="submit"
                disabled={savingByok}
                className="bg-[#4f6ef7] hover:bg-[#3d5ce0] text-white font-semibold rounded-xl px-6 py-3 transition-colors disabled:opacity-60 flex items-center gap-2 text-sm"
              >
                {savingByok ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save API Settings
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
