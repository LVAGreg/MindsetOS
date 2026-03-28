'use client';

import DashboardPage from '@/app/dashboard/page';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const { setCurrentConversation, isAuthenticated, user } = useAppStore();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated || !user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/c/${conversationId}`);
      return;
    }

    // Set the conversation (don't redirect, stay on /c/[id] URL)
    setCurrentConversation(conversationId);
    console.log(`📂 Loading conversation: ${conversationId}`);
  }, [conversationId, isAuthenticated, user, router, setCurrentConversation]);

  // Render the dashboard page at this URL
  return <DashboardPage />;
}
