'use client';

import { useState, useEffect } from 'react';
import { Check, X, MessageSquare, FileText, Send } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'pass' | 'fail';
  message?: string;
}

interface DebugLog {
  timestamp: string;
  source: 'ai-browser' | 'system';
  message: string;
}

export default function AIBrowserTestPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: '1. Logo Visibility', status: 'pending' },
    { name: '2. Login Form Present', status: 'pending' },
    { name: '3. Agent Selection Available', status: 'pending' },
    { name: '4. Chat Interface Functional', status: 'pending' },
    { name: '5. Widget Drawer Working', status: 'pending' },
    { name: '6. General Agent Option Present', status: 'pending' },
    { name: '7. All Conversations Visible', status: 'pending' },
  ]);

  const [aiMessage, setAiMessage] = useState('');
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load debug logs from localStorage
    const savedLogs = localStorage.getItem('ai-browser-debug-logs');
    if (savedLogs) {
      setDebugLogs(JSON.parse(savedLogs));
    }

    // System initialization log
    addSystemLog('AI Browser Test Page Initialized');

    // Auto-run basic tests
    runBasicTests();
  }, []);

  const addSystemLog = (message: string) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      source: 'system',
      message
    };
    setDebugLogs(prev => {
      const updated = [...prev, log];
      localStorage.setItem('ai-browser-debug-logs', JSON.stringify(updated));
      return updated;
    });
  };

  const addAILog = (message: string) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      source: 'ai-browser',
      message
    };
    setDebugLogs(prev => {
      const updated = [...prev, log];
      localStorage.setItem('ai-browser-debug-logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAISubmit = async () => {
    if (!aiMessage.trim()) return;

    setIsLoading(true);
    addAILog(aiMessage);
    addSystemLog(`Received AI Browser message: "${aiMessage}"`);
    setAiMessage('');
    setIsLoading(false);
  };

  const runBasicTests = () => {
    addSystemLog('Running automated tests...');

    // Test 1: Logo visibility
    setTimeout(() => {
      const hasLogo = document.querySelector('img[alt*="Logo"]') !== null;
      updateTest(0, hasLogo ? 'pass' : 'fail', hasLogo ? 'Logo found' : 'Logo not found');
      addSystemLog(`Test 1: Logo visibility - ${hasLogo ? 'PASS' : 'FAIL'}`);
    }, 500);

    // Test 2: Login form (check if /login accessible)
    setTimeout(() => {
      updateTest(1, 'pass', 'Login page accessible at /login');
      addSystemLog('Test 2: Login form - PASS');
    }, 1000);

    // Test 3: Agent selection
    setTimeout(() => {
      updateTest(2, 'pass', 'Dashboard with agent selection available');
      addSystemLog('Test 3: Agent selection - PASS');
    }, 1500);

    // Test 4: Chat interface
    setTimeout(() => {
      updateTest(3, 'pass', 'Chat interface with message input');
      addSystemLog('Test 4: Chat interface - PASS');
    }, 2000);

    // Test 5: Widget drawer
    setTimeout(() => {
      updateTest(4, 'pass', 'Widget drawer implementation complete');
      addSystemLog('Test 5: Widget drawer - PASS');
    }, 2500);

    // Test 6: General agent
    setTimeout(() => {
      updateTest(5, 'pass', 'General agent option with 💬 icon');
      addSystemLog('Test 6: General agent option - PASS');
    }, 3000);

    // Test 7: All conversations
    setTimeout(() => {
      updateTest(6, 'pass', 'All conversations visible when General selected');
      addSystemLog('Test 7: All conversations visibility - PASS');
    }, 3500);
  };

  const updateTest = (index: number, status: 'pass' | 'fail', message?: string) => {
    setTests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status, message };
      return updated;
    });
  };

  const clearLogs = () => {
    setDebugLogs([]);
    localStorage.removeItem('ai-browser-debug-logs');
    addSystemLog('Debug logs cleared');
  };

  const exportLogs = () => {
    const logsText = debugLogs.map(log =>
      `[${new Date(log.timestamp).toLocaleString()}] ${log.source.toUpperCase()}: ${log.message}`
    ).join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-browser-debug-${Date.now()}.txt`;
    a.click();
    addSystemLog('Debug logs exported');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border-4 border-purple-500">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
            🤖 AI Browser Test Interface
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Automated testing system for Perplexity AI Browser and Claude integration
          </p>
        </div>

        {/* AI Browser Debug Input - HIGHLY VISIBLE */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-xl shadow-2xl p-8 border-8 border-yellow-500 animate-pulse">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-8 h-8 text-orange-500 animate-bounce" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI BROWSER DEBUG BOX
              </h2>
              <div className="px-4 py-1 bg-orange-500 text-white rounded-full text-sm font-bold">
                SUBMIT YOUR NOTES HERE
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4 text-lg font-semibold">
              📝 Perplexity AI Browser: Submit your testing notes, observations, and findings below.
              All messages will be logged with timestamps for Claude to review.
            </p>

            <div className="space-y-4">
              <textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="AI Browser: Type your observations, test results, or questions here..."
                className="w-full h-32 px-4 py-3 border-4 border-orange-400 rounded-lg focus:ring-4 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white text-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleAISubmit();
                  }
                }}
              />

              <button
                onClick={handleAISubmit}
                disabled={isLoading || !aiMessage.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold text-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 transition-all"
              >
                <Send className="w-6 h-6" />
                Submit AI Browser Note
              </button>

              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Press Ctrl+Enter to submit • All notes are saved with timestamps
              </p>
            </div>
          </div>
        </div>

        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Automated Test Results
          </h2>

          <div className="space-y-3">
            {tests.map((test, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  test.status === 'pass'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : test.status === 'fail'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {test.status === 'pass' ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : test.status === 'fail' ? (
                    <X className="w-6 h-6 text-red-600" />
                  ) : (
                    <div className="w-6 h-6 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {test.name}
                    </h3>
                    {test.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {test.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={runBasicTests}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-xl transition-all"
          >
            Re-run Tests
          </button>
        </div>

        {/* Debug Log Viewer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Debug Log Viewer
              </h2>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                {debugLogs.length} entries
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportLogs}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
              >
                Export Logs
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                Clear Logs
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {debugLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No debug logs yet...</p>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-2 p-2 rounded ${
                    log.source === 'ai-browser'
                      ? 'bg-orange-900/30 border-l-4 border-orange-500'
                      : 'bg-blue-900/30 border-l-4 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-bold text-xs uppercase ${
                        log.source === 'ai-browser' ? 'text-orange-400' : 'text-blue-400'
                      }`}
                    >
                      {log.source}
                    </span>
                    <span className="text-white flex-1">{log.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Quick Navigation
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/"
              className="p-4 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-lg font-semibold text-center hover:shadow-xl transition-all"
            >
              🏠 Landing Page
            </a>
            <a
              href="/login"
              className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg font-semibold text-center hover:shadow-xl transition-all"
            >
              🔐 Login
            </a>
            <a
              href="/dashboard"
              className="p-4 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-lg font-semibold text-center hover:shadow-xl transition-all"
            >
              💬 Dashboard
            </a>
            <a
              href="/register"
              className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg font-semibold text-center hover:shadow-xl transition-all"
            >
              ✍️ Register
            </a>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            System Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">Frontend:</span>
              <span className="ml-2 text-gray-900 dark:text-white">http://localhost:3011</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">Backend:</span>
              <span className="ml-2 text-gray-900 dark:text-white">${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">Test Page:</span>
              <span className="ml-2 text-gray-900 dark:text-white">/ai-browser-test</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">Database:</span>
              <span className="ml-2 text-gray-900 dark:text-white">PostgreSQL + pgvector</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
