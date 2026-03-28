'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAppStore((state) => state.setUser);
  const loadConversations = useAppStore((state) => state.loadConversations);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Google Sign-In was cancelled or failed');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      try {
        // Send code and state to backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/auth/google/callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code, state })
        });

        if (!response.ok) {
          throw new Error('Google authentication failed');
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Set user in store
        setUser(data.user);

        // Load conversations
        try {
          const conversationsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations`, {
            headers: {
              'Authorization': `Bearer ${data.accessToken}`
            }
          });

          if (conversationsResponse.ok) {
            const conversationsData = await conversationsResponse.json();
            if (conversationsData.conversations) {
              const formattedConversations = conversationsData.conversations.map((conv: any) => ({
                ...conv,
                history: conv.history ? {
                  currentId: conv.history.currentId,
                  messages: Object.fromEntries(
                    Object.entries(conv.history.messages || {}).map(([id, msg]: [string, any]) => [
                      id,
                      {
                        ...msg,
                        timestamp: new Date(msg.timestamp),
                        editedAt: msg.editedAt ? new Date(msg.editedAt) : null
                      }
                    ])
                  )
                } : { currentId: null, messages: {} },
                createdAt: new Date(conv.createdAt),
                updatedAt: new Date(conv.updatedAt)
              }));
              loadConversations(formattedConversations);
            }
          }
        } catch (convErr) {
          console.error('Failed to load conversations:', convErr);
        }

        // Redirect to dashboard
        router.push('/dashboard');
      } catch (err: any) {
        console.error('Google OAuth error:', err);
        setError('Authentication failed. Redirecting to login...');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, loadConversations]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 max-w-md w-full text-center" style={{ borderColor: '#fcc824' }}>
        {error ? (
          <>
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#fcc824' }} />
            <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
              Completing Google Sign-In
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we log you in...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-amber-900/20 dark:to-gray-900 px-4">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl shadow-2xl border-2 max-w-md w-full text-center" style={{ borderColor: '#fcc824' }}>
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#fcc824' }} />
          <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
