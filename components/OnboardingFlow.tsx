/**
 * OnboardingFlow Component
 * Step-by-step onboarding wizard with conversational AI agent
 * Phase 1.1 of Enhanced Onboarding & Brand Voice System
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OnboardingFlowProps {
  onComplete?: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps] = useState(11);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize conversation with client-onboarding agent
  useEffect(() => {
    initializeConversation();
  }, []);

  async function initializeConversation() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Create a new conversation with the client-onboarding agent
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: 'client-onboarding',
          title: 'New User Onboarding'
        })
      });

      if (!response.ok) throw new Error('Failed to create conversation');

      const data = await response.json();
      setConversationId(data.conversationId);

      // Send initial message to get the first onboarding question
      await sendMessage('Hello, I\'m ready to get started!', data.conversationId, true);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setErrorMessage('Could not start your onboarding session. Please refresh and try again.');
    }
  }

  async function sendMessage(content: string, convId?: string, isInit?: boolean) {
    const messageConvId = convId || conversationId;
    if (!messageConvId) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Add user message to UI (unless it's initialization)
    if (!isInit) {
      setMessages(prev => [...prev, { role: 'user', content }]);
      setInputValue('');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      setErrorMessage('Session expired — please refresh the page.');
      return;
    }

    try {
      const response = await fetch('/api/letta/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: messageConvId,
          message: content,
          agentId: 'client-onboarding'
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add assistant response to UI
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }

      // Update current step if provided
      if (data.currentStep) {
        setCurrentStep(data.currentStep);
        await updateOnboardingProgress(data.currentStep);
      }

      // Check if onboarding is complete
      if (data.onboardingComplete || data.currentStep >= totalSteps) {
        await completeOnboarding(data.coreMemories);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
      setErrorMessage('Message failed to send. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateOnboardingProgress(step: number) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/onboarding/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ step })
      });

      if (!response.ok) {
        console.error('Failed to update onboarding progress — step:', step);
        // Non-fatal: don't block the user, but surface a soft warning
        setErrorMessage('Progress save failed. Your conversation is still active.');
      }
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      setErrorMessage('Could not save your progress. Continue — your responses are still recorded.');
    }
  }

  async function completeOnboarding(coreMemories?: any) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coreMemories })
      });

      if (!response.ok) throw new Error('Failed to complete onboarding');

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }

      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setErrorMessage('Onboarding completion failed. Please refresh or contact support.');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
  }

  const progressPct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div
      style={{ minHeight: '100vh', background: '#09090f' }}
      className="flex items-center justify-center p-4"
    >
      <div
        style={{
          background: 'rgba(18,18,31,0.8)',
          border: '1px solid #1e1e30',
          borderRadius: '16px',
          overflow: 'hidden',
          maxWidth: '896px',
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4f6ef7 0%, #7c5bf6 100%)',
            padding: '24px'
          }}
        >
          <h1 style={{ color: '#ededf5', fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>
            Welcome to MindsetOS!
          </h1>
          <p style={{ color: 'rgba(237,237,245,0.75)', fontSize: '0.95rem' }}>
            Let&apos;s get you set up for your mindset journey
          </p>

          {/* Progress bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'rgba(237,237,245,0.85)', fontSize: '0.8rem' }}>
                Step {currentStep} of {totalSteps}
              </span>
              <span style={{ color: 'rgba(237,237,245,0.85)', fontSize: '0.8rem' }}>
                {progressPct}% Complete
              </span>
            </div>
            <div
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '9999px',
                height: '6px'
              }}
            >
              <div
                style={{
                  background: '#fcc824',
                  borderRadius: '9999px',
                  height: '6px',
                  width: `${progressPct}%`,
                  transition: 'width 300ms ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239,68,68,0.12)',
              borderBottom: '1px solid rgba(239,68,68,0.3)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ color: '#f87171', fontSize: '0.85rem' }}>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              style={{
                marginLeft: 'auto',
                color: '#f87171',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1
              }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Chat area */}
        <div
          style={{
            height: '384px',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ color: '#fcc824', fontSize: '1.5rem', marginBottom: '12px' }}>✦</div>
              <p style={{ color: '#ededf5', fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>
                Getting your session ready…
              </p>
              <p style={{ color: '#9090a8', fontSize: '0.85rem' }}>
                Your mindset coach will be with you in a moment.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '28rem',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    ...(message.role === 'user'
                      ? {
                          background: '#4f6ef7',
                          color: '#ededf5'
                        }
                      : {
                          background: 'rgba(30,30,48,0.9)',
                          border: '1px solid #1e1e30',
                          color: '#ededf5'
                        })
                  }}
                >
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '16px',
                  background: 'rgba(30,30,48,0.9)',
                  border: '1px solid #1e1e30',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center'
                }}
              >
                {[0, 0.1, 0.2].map((delay, i) => (
                  <div
                    key={i}
                    className="animate-bounce"
                    style={{
                      width: '8px',
                      height: '8px',
                      background: '#9090a8',
                      borderRadius: '50%',
                      animationDelay: `${delay}s`
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: '1px solid #1e1e30',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your response..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #1e1e30',
                background: 'rgba(9,9,15,0.8)',
                color: '#ededf5',
                fontSize: '0.9rem',
                outline: 'none',
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? 'not-allowed' : 'text'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isLoading || !inputValue.trim() ? '#1e1e30' : '#fcc824',
                color: isLoading || !inputValue.trim() ? '#5a5a72' : '#09090f',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
                whiteSpace: 'nowrap'
              }}
            >
              Send
            </button>
          </div>
        </form>

        {/* Helper text */}
        <div
          style={{
            background: 'rgba(9,9,15,0.5)',
            borderTop: '1px solid #1e1e30',
            padding: '12px 24px',
            textAlign: 'center'
          }}
        >
          <p style={{ color: '#5a5a72', fontSize: '0.8rem', margin: 0 }}>
            Answer honestly and thoughtfully. This information will help personalize your MindsetOS experience.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
