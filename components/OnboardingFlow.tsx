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

  // Initialize conversation with client-onboarding agent
  useEffect(() => {
    initializeConversation();
  }, []);

  async function initializeConversation() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Create a new conversation with the client-onboarding agent
      const response = await fetch('http://localhost:3010/api/conversations', {
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
    }
  }

  async function sendMessage(content: string, convId?: string, isInit?: boolean) {
    const messageConvId = convId || conversationId;
    if (!messageConvId) return;

    setIsLoading(true);

    // Add user message to UI (unless it's initialization)
    if (!isInit) {
      setMessages(prev => [...prev, { role: 'user', content }]);
      setInputValue('');
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3010/api/letta/chat', {
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
    } finally {
      setIsLoading(false);
    }
  }

  async function updateOnboardingProgress(step: number) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('http://localhost:3010/api/onboarding/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ step })
      });
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
    }
  }

  async function completeOnboarding(coreMemories?: any) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:3010/api/onboarding/complete', {
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
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold mb-2">Welcome to MindsetOS!</h1>
          <p className="text-indigo-100">Let's get you set up for your mindset journey</p>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-indigo-400 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="h-96 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">Initializing your onboarding session...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-3 rounded-2xl bg-gray-100">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your response..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Send
            </button>
          </div>
        </form>

        {/* Helper text */}
        <div className="bg-gray-50 p-4 text-center text-sm text-gray-600">
          <p>Answer honestly and thoughtfully. This information will help personalize your MindsetOS experience.</p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
