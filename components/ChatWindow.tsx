'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import posthog from 'posthog-js';
import { Send, Loader2, Sparkles, ChevronUp, ChevronDown, Square, Paperclip, X, FileText, Mic, ThumbsUp, ThumbsDown, Copy, Check, Edit2, RefreshCw, Phone, PanelRightOpen, BarChart2, ArrowRight } from 'lucide-react';
import { useAppStore, MINDSET_AGENTS } from '@/lib/store';
import { apiClient } from '@/lib/api-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MemoryNotification from './MemoryNotification';
import MemoryContextSuggestion from './MemoryContextSuggestion';
import { MemoryPreviewPanel } from './MemoryPreviewPanel';
import { MemoryBadge } from './MemoryBadge';
import VoiceDictation from './VoiceDictation';
import AssetsPanel from './AssetsPanel';
import ForkNavigation from './ForkNavigation';
import MindsetOSLogo from './MindsetOSLogo';
import MessageEditModal from './MessageEditModal';
import ConversationStats from './ConversationStats';
import { buildMessageChain, MessageNode } from '../types/conversation';
import { AgentIcon } from '@/lib/agent-icons';
import dynamic from 'next/dynamic';

// Agent accent hex map (for inline styles / opacity variants)
const AGENT_HEX: Record<string, string> = {
  'mindset-score': '#f59e0b',
  'reset-guide': '#0ea5e9',
  'architecture-coach': '#7c3aed',
  'practice-builder': '#10b981',
  'story-excavator': '#ea580c',
  'launch-companion': '#475569',
  'accountability-partner': '#16a34a',
  'conversation-curator': '#14b8a6',
  'decision-framework': '#2563eb',
  'inner-world-mapper': '#ec4899',
  'goal-architect': '#eab308',
  'belief-debugger': '#9333ea',
  'morning-ritual-builder': '#f43f5e',
  'energy-optimizer': '#84cc16',
  'fear-processor': '#dc2626',
  'relationship-architect': '#06b6d4',
  'focus-trainer': '#6366f1',
  'values-clarifier': '#c026d3',
  'transformation-tracker': '#22c55e',
  'content-architect': '#f97316',
};

// Dynamically import VoiceChatLive for real-time Gemini voice
const VoiceChatLive = dynamic(() => import('./VoiceChatLive'), { ssr: false });

interface ChatWindowProps {
  agentId: string;
  userRole?: string;
  conversationId?: string;
}
// Helper function to clean structured output markers from content
// IMPORTANT: Do NOT modify the AI response - only remove onboarding data tags
function cleanStructuredOutput(content: string, widgetFormattingEnabled: boolean = false): string {
  let cleaned = content;

  // Only remove <STRUCTURED_DATA> XML tags and their content (for onboarding system)
  cleaned = cleaned.replace(/<STRUCTURED_DATA>[\s\S]*?<\/STRUCTURED_DATA>/gi, '');

  // Remove any remaining structured data markers (JSON blocks for onboarding)
  cleaned = cleaned.replace(/\{[\s\S]*?"onboarding_complete"[\s\S]*?\}/gi, '');

  // DO NOT remove OPTIONS:, MULTI-SELECT:, or any other content from AI responses
  // The response should appear exactly as the AI wrote it

  // Clean up extra whitespace only
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

// Helper function to parse examples from AI response
function parseExamples(content: string): { beforeExamples: string; examples: string[]; afterExamples: string; format: 'ex' | 'options' | 'multiselect'; categories?: Array<{name: string; options: string[]}> } | null {
  // Try MULTI-SELECT format first: "MULTI-SELECT:\n1. Option\n2. Option" (for v4)
  // This format can have multiple MULTI-SELECT sections across categories
  if (content.includes('MULTI-SELECT:')) {
    const allOptions: string[] = [];
    const categories: Array<{name: string; options: string[]}> = [];
    let firstMatchIndex = -1;
    let lastMatchEnd = 0;

    // Find categories with **Category Name:**
    // Stop at the next ** or instructional text (Select/Remember/Choose/etc.)
    const categoryRegex = /\*\*([^*]+):\*\*\s*\n\s*MULTI-SELECT:\s*\n([\s\S]*?)(?=\n\*\*|\n(?:Select|Remember|Choose|Note:|Important:)|$)/gi;
    let match;

    while ((match = categoryRegex.exec(content)) !== null) {
      if (firstMatchIndex === -1) {
        firstMatchIndex = match.index;
      }
      lastMatchEnd = match.index + match[0].length;

      const categoryName = match[1].trim();
      const optionsText = match[2];
      const options = optionsText
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          return line.replace(/^[\s\*\-]*\d+[\.)\-\s]+/, '').replace(/^[\*\-]\s*/, '').trim();
        })
        .filter(line => {
          const trimmed = line.trim();
          // Filter out empty lines, section headers, and instructional text
          return trimmed.length > 0
            && trimmed.length < 100  // Options shouldn't be super long
            && !trimmed.includes('?')  // Questions are instructions, not options
            && !trimmed.toLowerCase().includes('thinking about')  // Descriptive text
            && !trimmed.toLowerCase().includes('what ')  // Question words
            && !trimmed.toLowerCase().includes('select ')  // Instructions
            && !trimmed.match(/^[A-Z][a-z]+:/)
            && !trimmed.match(/^MULTI-SELECT:/i)
            && !trimmed.match(/^(Select|Remember|Choose|Note|Important|Thinking)/i);
        });

      if (options.length > 0) {
        categories.push({ name: categoryName, options });
        allOptions.push(...options);
      }
    }

    if (allOptions.length > 0) {
      return {
        beforeExamples: content.substring(0, firstMatchIndex).trim(),
        examples: allOptions,
        afterExamples: content.substring(lastMatchEnd).trim(),
        format: 'multiselect',
        categories: categories.length > 0 ? categories : undefined
      };
    }

    // Fallback: Try simple MULTI-SELECT format without categories
    const simpleMultiSelectMatch = content.match(/MULTI-SELECT:\s*\n([\s\S]*?)(?=\n\n|Do any|Which|Let me know|$)/i);
    if (simpleMultiSelectMatch) {
      const multiSelectIndex = content.indexOf('MULTI-SELECT:');
      const optionsText = simpleMultiSelectMatch[1];
      const options = optionsText
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[\s\*\-]*\d+[\.)\-\s]+/, '').replace(/^[\*\-]\s*/, '').trim())
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0
            && trimmed.length < 200
            && !trimmed.match(/^MULTI-SELECT:/i)
            && !trimmed.match(/^(Select|Remember|Choose|Note|Important|Do any|Which|Let)/i);
        });

      if (options.length > 0) {
        const matchEnd = multiSelectIndex + simpleMultiSelectMatch[0].length;
        return {
          beforeExamples: content.substring(0, multiSelectIndex).trim(),
          examples: options,
          afterExamples: content.substring(matchEnd).trim(),
          format: 'multiselect'
        };
      }
    }
  }

  // Try OPTIONS format or "CHOOSE AN OPTION:" format
  // First find where OPTIONS: starts
  const optionsStartMatch = content.match(/(?:OPTIONS?:|CHOOSE AN OPTION:|% CHOOSE AN OPTION:)\s*\n?/i);

  if (optionsStartMatch) {
    const optionsStartIndex = optionsStartMatch.index || 0;
    const afterOptionsMarker = content.substring(optionsStartIndex + optionsStartMatch[0].length);

    // Parse options line by line for better control
    const lines = afterOptionsMarker.split('\n');
    const options: string[] = [];

    for (const line of lines) {
      // Strip bullet points and clean the line
      const trimmed = line.replace(/^[\s•\-\*]+/, '').trim();
      if (!trimmed) continue;

      // Stop at common ending patterns
      if (/^(Which|What|Remember|Here'?s why|Let me know|Help me|Or is|Because)/i.test(trimmed)) break;

      // Skip subtitle/description lines (italics only, parenthetical only)
      if (/^\*[^*]+\*$/.test(trimmed)) continue; // *italic text*
      if (/^\([^)]+\)$/.test(trimmed)) continue; // (parenthetical only)
      if (/^\*\([^)]+\)\*$/.test(trimmed)) continue; // *(parenthetical)*

      // Match option patterns:
      // - "A)" or "**A)**" or "A." or "1)" etc
      // - "Option A =" or "Option A:" etc
      const optionMatch = trimmed.match(/^(?:\*\*)?(?:Option\s+)?([A-Za-z0-9]+)[).\-:=](?:\*\*)?\s*(.+)/i);

      if (optionMatch) {
        let optionText = optionMatch[2].trim();
        // Strip all markdown formatting
        optionText = optionText
          .replace(/\*\*/g, '')  // bold **text**
          .replace(/(?<!\*)\*(?!\*)/g, '')  // italic *text* but not **
          .replace(/^[""]|[""]$/g, '') // quotes
          .replace(/\s+/g, ' ')  // normalize whitespace
          .trim();

        // Skip if too short or looks like a subtitle
        if (optionText.length > 5 && optionText.length < 300 && !optionText.match(/^\([^)]+\)$/)) {
          options.push(optionText);
        }
      }
    }

    if (options.length > 0) {
      return {
        beforeExamples: content.substring(0, optionsStartIndex).trim(),
        examples: options,
        afterExamples: '', // Simplified
        format: 'options'
      };
    }
  }

  // Fallback: Try to find A), B), C) style options anywhere (without OPTIONS: marker)
  // Note: Using 'gi' flags only (no 's' flag) for ES5 compatibility
  const letterOptionPattern = /(?:^|\n)\s*[•\-\*]?\s*(?:\*\*)?([A-D])\)(?:\*\*)?\s+([^\n]+)/gi;
  const letterOptions: string[] = [];
  let letterMatch;

  while ((letterMatch = letterOptionPattern.exec(content)) !== null) {
    let optionText = letterMatch[2].trim();
    // Strip markdown (using simple replace, no lookbehind for ES5 compat)
    optionText = optionText
      .replace(/\*\*/g, '')
      .replace(/\*([^*]+)\*/g, '$1') // Replace *italic* with just text
      .replace(/\s+/g, ' ')
      .trim();

    if (optionText.length > 5 && optionText.length < 300) {
      letterOptions.push(optionText);
    }
  }

  if (letterOptions.length >= 2) {
    const firstMatch = content.match(/(?:^|\n)\s*[•\-\*]?\s*(?:\*\*)?[A-D]\)/);
    const matchIndex = firstMatch?.index || 0;
    return {
      beforeExamples: content.substring(0, matchIndex).trim(),
      examples: letterOptions,
      afterExamples: '',
      format: 'options'
    };
  }

  // Fallback to Ex: format: Ex: "option 1" | "option 2"
  const examplePattern = /Ex:\s*[""]([^""]+)[""](?:\s*\|\s*[""]([^""]+)[""])?/i;
  const match = content.match(examplePattern);

  if (!match) return null;

  const matchIndex = match.index || 0;
  const beforeExamples = content.substring(0, matchIndex).trim();
  const afterExamples = content.substring(matchIndex + match[0].length).trim();

  const examples = [match[1]];
  if (match[2]) examples.push(match[2]);

  return { beforeExamples, examples, afterExamples, format: 'ex' };
}

// Helper function to generate intelligent fallback suggestions
function generateFallbackSuggestions(messageContent: string, agentId: string): string[] {
  // Get agent-specific starter prompts as fallback
  const agent = Object.values(MINDSET_AGENTS).find(a => a.id === agentId);
  const starterPrompts = agent?.starterPrompts || [];

  // Intelligent suggestions based on common conversational patterns
  const questionPatterns = [
    { pattern: /who\s+(is|are)/i, suggestions: ['Tell me more about that', 'Can you be more specific?', 'What else should I know?'] },
    { pattern: /what\s+(is|are)/i, suggestions: ['How does that work?', 'Tell me more', 'Why is that important?'] },
    { pattern: /why/i, suggestions: ['Can you give me an example?', 'Tell me more about that', 'What should I do next?'] },
    { pattern: /how/i, suggestions: ['What are the next steps?', 'Can you show me an example?', 'What else do I need?'] },
    { pattern: /(ready|begin|start|let'?s)/i, suggestions: ['Yes, let\'s begin', 'I\'m ready', 'Let\'s start'] },
    { pattern: /help|guide|assist/i, suggestions: ['Yes, please help me', 'What should I do first?', 'I need guidance'] },
    { pattern: /specific|detail|example/i, suggestions: ['Here\'s what I\'m thinking...', 'Let me explain...', 'I want to share more details'] },
  ];

  // Check message content for patterns
  for (const { pattern, suggestions } of questionPatterns) {
    if (pattern.test(messageContent)) {
      return suggestions;
    }
  }

  // Generic fallback suggestions
  const genericSuggestions = [
  ];

  // Use starter prompts if available, otherwise use generic
  return starterPrompts.length > 0 ? starterPrompts.slice(0, 3) : genericSuggestions;
}

export default function ChatWindow({ agentId, userRole, conversationId: propConversationId }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Agent data from API
  const [agentDataFromAPI, setAgentDataFromAPI] = useState<any>(null);

  // Multi-select state for v4 agent - keyed by message ID to prevent cross-widget contamination
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  // Widget visibility state - track which widgets are hidden
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set());

  // Drawer visibility state - track which suggestion drawers are open
  const [openDrawers, setOpenDrawers] = useState<Set<string>>(new Set());

  // Message actions state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({});

  // Assets panel state
  const [showAssetsPanel, setShowAssetsPanel] = useState(false);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Model override state (admin only)
  const [availableModels, setAvailableModels] = useState<Record<string, any>>({});
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fork/branch editing state
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);

  const toggleWidgetVisibility = (widgetId: string) => {
    setHiddenWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  const toggleDrawer = (drawerId: string) => {
    setOpenDrawers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(drawerId)) {
        newSet.delete(drawerId);
      } else {
        newSet.add(drawerId);
      }
      return newSet;
    });
  };

  const toggleOption = (option: string) => {
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(option)) {
        newSet.delete(option);
      } else {
        newSet.add(option);
      }
      return newSet;
    });
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // Helper function to check if a string is a valid UUID
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handleFeedback = async (messageId: string, feedback: 'up' | 'down') => {
    const currentFeedback = messageFeedback[messageId];
    const newFeedback = currentFeedback === feedback ? undefined : feedback;

    // Optimistic update
    setMessageFeedback(prev => {
      if (newFeedback === undefined) {
        const { [messageId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [messageId]: newFeedback };
    });

    try {
      if (newFeedback) {
        const token = localStorage.getItem('accessToken');
        // Submit feedback
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            messageId,
            conversationId: currentConversationId,
            agentId: agentId,
            feedbackType: newFeedback
          })
        });
      } else {
        // Remove feedback
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/feedback/${messageId}`, {
          method: 'DELETE',
          headers: {
          }
        });
      }
    } catch (error) {
      console.error('Failed to save feedback:', error);
      // Revert on error
      setMessageFeedback(prev => ({
        ...prev,
        [messageId]: currentFeedback
      }));
    }
  };

  // Helper function to reload conversation from backend
  const reloadConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      // Add cache-busting timestamp to force fresh fetch after branch switch
      const cacheBust = `?_t=${Date.now()}`;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations${cacheBust}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        console.error('Failed to reload conversations');
        return;
      }

      const data = await response.json();
      const conv = data.conversations.find((c: any) => c.id === conversationId);

      if (conv && conv.history) {
        const messageCount = Object.keys(conv.history.messages).length;
        console.log(`🔍 [RELOAD] Received tree with ${messageCount} messages for conversation ${conversationId}`);
        console.log(`🔍 [RELOAD] Current branch leaf ID: ${conv.history.currentId}`);

        const messageIds = Object.keys(conv.history.messages);
        if (messageIds.length > 0) {
          console.log(`🔍 [RELOAD] Message IDs:`, messageIds.map(id => `${id.substring(0, 8)}...`));
        }

        // Load history into store - backend provides tree structure
        loadConversationHistory(conversationId, conv.history);
        console.log('✅ [RELOAD] Conversation history reloaded with tree structure');
      } else {
        console.error(`❌ [RELOAD] Conversation ${conversationId} not found or missing history in backend response`);
      }
    } catch (error) {
      console.error('❌ [RELOAD] Error reloading conversation:', error);
    }
  };

  // Fork/branch handlers
  const handleEditMessage = async (newContent: string) => {
    if (!editingMessage || !currentConversationId) return;

    const originalMessageId = editingMessage.id;

    try {
      const result = await editMessage(originalMessageId, newContent);
      if (result.success && result.newMessage) {
        console.log('✅ Message edited successfully, new branch created');
        console.log('🔄 New message ID:', result.newMessage.id);

        // Close the edit modal
        setEditingMessage(null);

        // Reload conversation from backend to get correct branch structure
        // Backend has already updated active_branch_leaf_id and stored the branch
        await reloadConversation(currentConversationId);
        console.log('✅ [EDIT] Message edited, branch created, conversation reloaded');

        // Trigger AI response for the edited message (without creating duplicate user message)
        await triggerAIResponse(newContent, currentConversationId);
        console.log('✅ [EDIT] Triggered AI response for edited message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      setErrorMessage('Failed to edit message. Please try again.');
      setShowError(true);
      setEditingMessage(null);
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    // Only allow regeneration for saved messages with real UUIDs
    if (!isValidUUID(messageId)) {
      console.log('Cannot regenerate temporary message:', messageId);
      setErrorMessage('Cannot regenerate unsaved messages. Please wait for the message to be saved first.');
      setShowError(true);
      return;
    }

    try {
      const result = await regenerateMessage(messageId);
      if (result.success && result.regenerateData) {
        const { conversationId, userMessage } = result.regenerateData;

        console.log('✅ [REGENERATE] Triggering AI response for same user message');

        // Trigger AI response with the parent user message (without creating duplicate)
        await triggerAIResponse(userMessage, conversationId);
        console.log('✅ [REGENERATE] AI response triggered successfully');
      }
    } catch (error) {
      console.error('Error regenerating message:', error);
      setErrorMessage('Failed to regenerate message. Please try again.');
      setShowError(true);
    }
  };

  const handleBranchChange = async (messageId: string, newBranchIndex: number) => {
    if (!currentConversationId || !currentConversation?.history) return;

    console.log(`🔀 [BRANCH_CHANGE] Starting branch switch to index ${newBranchIndex} for message ${messageId}`);

    try {
      // Find the sibling message in the tree
      const parentMessage = Object.values(currentConversation.history.messages).find(
        msg => msg.childrenIds.includes(messageId)
      );

      if (!parentMessage) {
        console.error('❌ [BRANCH_CHANGE] Could not find parent message');
        return;
      }

      // Get the sibling at the specified branch index
      const siblingId = parentMessage.childrenIds[newBranchIndex];
      if (!siblingId) {
        console.error(`❌ [BRANCH_CHANGE] No sibling found at index ${newBranchIndex}`);
        return;
      }

      console.log(`🔍 [BRANCH_CHANGE] Found sibling ${siblingId.substring(0, 8)}... at branch ${newBranchIndex}`);

      // Find the leaf (last message) in this sibling's branch by walking down
      let leafId = siblingId;
      let currentMsg = currentConversation.history.messages[siblingId];
      while (currentMsg && currentMsg.childrenIds.length > 0) {
        // Follow the last child (most recent in branch)
        leafId = currentMsg.childrenIds[currentMsg.childrenIds.length - 1];
        currentMsg = currentConversation.history.messages[leafId];
      }

      console.log(`🍃 [BRANCH_CHANGE] Found branch leaf: ${leafId.substring(0, 8)}...`);

      // Update currentId locally - this triggers useMemo to rebuild chain
      useAppStore.setState((state) => {
        const conv = state.conversations[currentConversationId];
        if (!conv || !conv.history) return state;

        return {
          conversations: {
            ...state.conversations,
            [currentConversationId]: {
              ...conv,
              history: {
                ...conv.history,
                currentId: leafId, // Point to the leaf of the selected branch
              },
            },
          },
        };
      });

      console.log(`✅ [BRANCH_CHANGE] Updated currentId to ${leafId.substring(0, 8)}..., UI should rebuild instantly`);

      // Also update backend for persistence (don't await - fire and forget)
      switchBranch(currentConversationId, messageId, newBranchIndex).catch(err => {
        console.error('⚠️ [BRANCH_CHANGE] Backend update failed (UI already switched):', err);
      });

    } catch (error) {
      console.error('❌ [BRANCH_CHANGE] Error switching branch:', error);
      // Fallback to full reload if local switch fails
      await reloadConversation(currentConversationId);
    }
  };

  const sendSelectedOptions = () => {
    if (selectedOptions.size === 0) return;
    const concatenated = Array.from(selectedOptions).join(' + ');
    setInput(concatenated); // Put in text box for review
    setSelectedOptions(new Set()); // Clear selections
    // Focus the textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // File attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`File "${file.name}" is not a supported type. Only PDF, DOCX, TXT, and MD files are allowed.`);
        setShowError(true);
        continue;
      }

      if (file.size > maxSize) {
        setErrorMessage(`File "${file.name}" is too large. Maximum size is 10MB.`);
        setShowError(true);
        continue;
      }

      validFiles.push(file);
    }

    setAttachedFiles(prev => [...prev, ...validFiles]);

    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];

    setUploading(true);
    const uploadedDocIds: string[] = [];

    try {
      for (const file of attachedFiles) {
        // Use apiClient which automatically includes Authorization header
        const data = await apiClient.uploadDocument(file, agentId);
        uploadedDocIds.push(data.id);
      }

      return uploadedDocIds;
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload attachments');
      setShowError(true);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('text')) return '📃';
    if (fileType.includes('markdown')) return '📋';
    return '📎';
  };

  // Voice dictation handlers
  const handleTranscriptUpdate = (transcript: string) => {
    setInput(prev => prev + (prev ? ' ' : '') + transcript);
  };

  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [contextSuggestion, setContextSuggestion] = useState<{ message: string; memoryCount: number } | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0); // Force re-render when message IDs change
  const [showVoiceChat, setShowVoiceChat] = useState(false);

  // Check if this is a voice agent
  const isVoiceAgent = agentId === 'voice-expert' || agentId === 'sales-roleplay-coach';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    user,
    currentConversationId,
    conversations,
    addMessage,
    createConversation,
    setCurrentConversation,
    setStreamingResponse,
    isStreamingResponse,
    recentMemories,
    addRecentMemory,
    removeRecentMemory,
    memoryEnabled,
    memorySettings,
    activeClientProfileId,
    createCustomAgent,
    widgetFormattingEnabled,
    importedMemory,
    setImportedMemory,
    confirmMemory,
    updateMemoryItem,
    editMessage,
    regenerateMessage,
    switchBranch,
    loadConversationHistory,
  } = useAppStore();

  const canvasEnabled = useAppStore(s => s.canvasEnabled);
  const openCanvas = useAppStore(s => s.openCanvas);
  const viewAsUser = useAppStore(s => s.viewAsUser);
  const impersonationSession = useAppStore(s => s.impersonationSession);

  // View-only mode: admin is viewing another user but hasn't been granted edit access
  const isViewOnly = !!(viewAsUser && impersonationSession && impersonationSession.status !== 'edit_approved');

  const currentConversation = currentConversationId
    ? conversations[currentConversationId]
    : null;

  // Build message chain from tree structure (reactive to currentId changes)
  const messages = useMemo(() => {
    if (!currentConversation?.history) return [];
    return buildMessageChain(currentConversation.history);
  }, [currentConversation?.history?.currentId, currentConversation?.history?.messages, messageUpdateTrigger]);

  // Fetch agent data from API to get conversation starters
  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/agents`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) return;

        const data = await response.json();
        const agents = data.agents || [];
        const agent = agents.find((a: any) => a.id === agentId);

        if (agent) {
          setAgentDataFromAPI(agent);
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      }
    };

    fetchAgentData();
  }, [agentId]);

  // Clear selections when a new widget/question appears
  useEffect(() => {
    if (!messages) return;

    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // Clear selections when we get a new assistant message
    if (lastAssistantMessage?.id) {
      setSelectedOptions(new Set());
    }
  }, [messages.length]); // Only trigger on message count changes

  // Auto-open widget drawer when widget is present
  useEffect(() => {
    if (!messages || !widgetFormattingEnabled) return;

    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];

    // Auto-open drawer if last message has a widget
    if (lastAssistantMessage?.widget || lastAssistantMessage?.content?.includes('MULTI-SELECT:')) {
      const drawerId = `${lastAssistantMessage.id}_suggestions`;
      setOpenDrawers(prev => {
        const newSet = new Set(prev);
        newSet.add(drawerId);
        return newSet;
      });
    }
  }, [messages.length, widgetFormattingEnabled]); // Trigger when messages change or widget formatting toggles

  // Fetch database user ID
  useEffect(() => {
    const fetchDbUserId = async () => {
      if (!user?.email) return;

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/user/by-email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setDbUserId(data.dbUserId);
        } else if (res.status === 404) {
          // User not in database yet - create them
          console.log('Creating database user for:', user.email);
          const createRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/consultants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              firstName: user.firstName || 'User',
              lastName: user.lastName || ''
            })
          });
          if (createRes.ok) {
            const newUser = await createRes.json();
            setDbUserId(newUser.id);
            console.log('✅ Database user created:', newUser.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch database user ID:', error);
      }
    };

    fetchDbUserId();
  }, [user?.email]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, recentMemories]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Auto-focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Global keyboard listener - focus textarea when user starts typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't steal focus if user is typing in another input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Don't steal focus for special keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Escape' || e.key === 'Tab') {
        return;
      }

      // Focus textarea for alphanumeric and common typing keys
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Space') {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch memory context suggestion when agent changes or conversation is empty
  useEffect(() => {
    const fetchContextSuggestion = async () => {
      if (!dbUserId || !agentId) return;

      // Show suggestion when relevant memories exist
      const messageCount = messages.length || 0;
      // Show for first 5 messages instead of 3
      if (messageCount >= 5) {
        setShowSuggestion(false);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/context-suggest/${dbUserId}/${agentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasContext && data.message) {
            setContextSuggestion({
              message: data.message,
              memoryCount: data.memoryCount
            });
            setShowSuggestion(true);
          } else {
            setShowSuggestion(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch context suggestion:', error);
      }
    };

    fetchContextSuggestion();
  }, [dbUserId, agentId, messages.length]);

  // Load available models for admin users
  useEffect(() => {
    const loadModels = async () => {
      if (userRole !== 'admin' || !propConversationId) return;

      setLoadingModels(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/admin/ai-models`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const modelsRecord = data.models.reduce((acc: Record<string, any>, model: any) => {
            acc[model.id] = model;
            return acc;
          }, {});
          setAvailableModels(modelsRecord);

          // Set current model override if exists
          if (currentConversation?.modelOverride) {
            setSelectedModel(currentConversation.modelOverride);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setLoadingModels(false);
      }
    };

    loadModels();
  }, [userRole, propConversationId, currentConversation?.modelOverride]);

  // Check for new memories after AI response
  const checkForNewMemories = async (conversationId: string, messageId: string) => {
    if (!dbUserId) return;

    try {
      // Wait 2 seconds for memory extraction to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/history/${dbUserId}?limit=10`);
      if (!res.ok) return;

      const history = await res.json();
      const tenSecondsAgo = new Date(Date.now() - 10000);

      const recentCreations = history.filter((h: any) => {
        const createdAt = new Date(h.created_at);
        return h.action === 'created' && createdAt > tenSecondsAgo;
      });

      // Add to recent memories
      recentCreations.forEach((h: any) => {
        addRecentMemory({
          id: h.memory_id,
          content: h.new_content,
          memory_type: h.memory_type || 'general',
          importance_score: h.new_importance || 0.5,
          conversationId,
          messageId,
          timestamp: new Date(h.created_at),
        });
      });
    } catch (error) {
      console.error('Failed to check for new memories:', error);
    }
  };

  // Render backend-provided widget
  const renderBackendWidget = (widget: any, isInteractive: boolean = true, messageId?: string) => {
    if (!widget || !widget.type) return null;

    const { type, data } = widget;
    const widgetId = `${messageId}_${type}`;
    const isHidden = hiddenWidgets.has(widgetId);

    // NOTE: Widget wrapper removed - widgets now render directly in drawer without individual toggle buttons
    // The drawer itself handles the toggle functionality

    // Agent handoff suggestion card
    if (type === 'agent_handoff') {
      const agents: { id: string; name: string; slug: string }[] = data?.agents || [];
      if (agents.length === 0) return null;
      return (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#fcc824' }}>
            Suggested Next Step{agents.length > 1 ? 's' : ''}
          </p>
          {agents.map(agent => {
            const hex = AGENT_HEX[agent.slug] || '#6366f1';
            return (
              <button
                key={agent.id}
                onClick={() => { window.location.href = `/dashboard?agent=${agent.slug}`; }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left group transition-all"
                style={{
                  background: `${hex}0d`,
                  border: `1px solid ${hex}30`,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${hex}60`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = `${hex}30`)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${hex}20` }}
                  >
                    <AgentIcon agentId={agent.slug} className="w-4 h-4" style={{ color: hex }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#ededf5]">{agent.name}</p>
                    <p className="text-xs" style={{ color: hex }}>Continue your work →</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: hex }} />
              </button>
            );
          })}
        </div>
      );
    }

    // Multi-select widget (existing functionality)
    if (type === 'multi_select') {
      return (
        <div className="space-y-3 pt-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">
            {data.instruction || 'Select multiple options (+ to add, − to remove):'}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {data.options?.map((option: string, idx: number) => {
              const isSelected = selectedOptions.has(option);
              return (
                <button
                  key={idx}
                  onClick={() => isInteractive && toggleOption(option)}
                  disabled={isLoading || !isInteractive}
                  className={`px-4 py-2.5 border rounded-lg transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600'
                      : 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700 hover:border-yellow-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`font-bold text-lg flex-shrink-0 mt-0.5 ${
                      isSelected ? 'text-yellow-700 dark:text-yellow-400' : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {isSelected ? '−' : '+'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedOptions.size > 0 && isInteractive && (
            <button
              onClick={() => handleSendMessage(Array.from(selectedOptions).join(' + '))}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Selected ({selectedOptions.size})
            </button>
          )}

          {/* Action buttons for multi_select */}
          {data.actionButtons && data.actionButtons.length > 0 && isInteractive && (
            <div className="flex gap-2 mt-3">
              {data.actionButtons.map((button: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(button.message)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {button.icon && <span className="mr-1">{button.icon}</span>}
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Quick-select widget (single choice)
    if (type === 'quick_select') {
      return (
        <div className="space-y-3 pt-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {data.question || 'Choose one:'}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {data.options?.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => isInteractive && handleSendMessage(option)}
                disabled={isLoading || !isInteractive}
                className="px-4 py-2.5 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg hover:border-yellow-500 transition-all text-left font-medium text-gray-800 dark:text-gray-200 disabled:opacity-50 text-sm"
              >
                {option}
              </button>
            ))}
          </div>

          {/* Action buttons for quick_select */}
          {data.actionButtons && data.actionButtons.length > 0 && isInteractive && (
            <div className="flex gap-2 mt-3">
              {data.actionButtons.map((button: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(button.message)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {button.icon && <span className="mr-1">{button.icon}</span>}
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Progress tracker widget
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    if (type === 'progress_tracker') {
      return (
        <div className="my-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{data.title || 'Progress'}</div>
          <div className="flex items-center gap-2">
            {data.steps?.map((step: string, i: number) => (
              <div key={i} className={`flex-1 text-center py-2 rounded text-sm font-medium ${
                i < data.current ? 'bg-green-500 text-white' :
                i === data.current ? 'bg-purple-500 text-white' :
                'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {step}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Rating widget
    if (type === 'rating') {
      return (
        <div className="my-4 flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.question || 'How does this sound?'}</span>
          <div className="flex gap-1">
            {[...Array(data.scale || 5)].map((_, i) => (
              <button
                key={i}
                onClick={() => isInteractive && handleSendMessage(`Rating: ${i + 1}/${data.scale || 5}`)}
                disabled={isLoading || !isInteractive}
                className="text-2xl hover:scale-110 transition disabled:opacity-50"
              >
                ⭐
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Checklist widget
    if (type === 'checklist') {
      return (
        <div className="my-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="font-medium mb-3 text-gray-800 dark:text-gray-200">{data.title || 'Checklist'}</div>
          {data.items?.map((item: string, i: number) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <input type="checkbox" className="rounded border-gray-300 dark:border-gray-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      );
    }

    // Slider group widget (NEW for Value Quantifier V6)
    if (type === 'slider_group') {
      const [sliderValues, setSliderValues] = useState<Record<string, number>>(
        Object.fromEntries(data.sliders?.map((s: any) => [s.id, s.defaultValue || s.min]) || [])
      );

      const formatValue = (value: number, format?: string, unit?: string) => {
        if (format === 'currency') return `$${value.toLocaleString()}`;
        if (format === 'percentage') return `${value}%`;
        if (format === 'number') return value.toLocaleString();
        return `${value}${unit || ''}`;
      };

      const handleSliderChange = (id: string, value: number) => {
        setSliderValues(prev => ({ ...prev, [id]: value }));
      };

      // Auto-send message when slider is released
      const handleSliderRelease = () => {
        if (!isInteractive || isLoading) return;

        // Build human-readable message from slider values
        const messages = data.sliders?.map((slider: any) => {
          const value = sliderValues[slider.id] || slider.defaultValue || slider.min;
          return `${slider.label}: ${formatValue(value, slider.format, slider.unit)}`;
        });

        const prompt = messages?.join(', ') || JSON.stringify(sliderValues);
        handleSendMessage(prompt);
      };

      return (
        <div className="space-y-4 pt-2">
          {data.instruction && (
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {data.instruction}
            </p>
          )}
          {data.sliders?.map((slider: any) => {
            const currentValue = sliderValues[slider.id] || slider.defaultValue || slider.min;
            return (
              <div key={slider.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {slider.label}
                  </label>
                  <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {formatValue(currentValue, slider.format, slider.unit)}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step || 1}
                  value={currentValue}
                  onChange={(e) => isInteractive && handleSliderChange(slider.id, Number(e.target.value))}
                  onMouseUp={handleSliderRelease}
                  onTouchEnd={handleSliderRelease}
                  disabled={!isInteractive || isLoading}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-600 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatValue(slider.min, slider.format, slider.unit)}</span>
                  <span>{formatValue(slider.max, slider.format, slider.unit)}</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // ROI calculator widget (NEW for Value Quantifier V6)
    if (type === 'roi_calculator') {
      const calc = data.calculations || {};
      const chartData = data.chartData || {};

      return (
        <div className="space-y-4 pt-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {data.instruction || 'Your ROI Breakdown:'}
          </p>

          {/* ROI Metrics Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
              <div className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400 font-semibold mb-1">
                Total Value
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                ${calc.totalValue?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-700">
              <div className="text-xs uppercase tracking-wide text-yellow-600 dark:text-yellow-400 font-semibold mb-1">
                Your Fee
              </div>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                ${calc.yourFee?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-700">
              <div className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                Net ROI
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                ${calc.netROI?.toLocaleString() || '0'}
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-700">
              <div className="text-xs uppercase tracking-wide text-purple-600 dark:text-purple-400 font-semibold mb-1">
                ROI Multiple
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {calc.roiMultiple?.toFixed(1) || '0'}x
              </div>
            </div>
          </div>

          {/* Payback Period */}
          {calc.paybackMonths && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-700">
              <div className="text-xs uppercase tracking-wide text-yellow-700 dark:text-yellow-400 font-semibold mb-1">
                Payback Period
              </div>
              <div className="text-xl font-bold text-yellow-800 dark:text-yellow-300">
                {calc.paybackMonths} months
              </div>
            </div>
          )}

          {/* Simple Bar Chart Visualization */}
          {chartData.labels && chartData.values && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Visual Breakdown
              </div>
              <div className="space-y-3">
                {chartData.labels.map((label: string, idx: number) => {
                  const value = chartData.values[idx];
                  const maxValue = Math.max(...chartData.values);
                  const percentage = (value / maxValue) * 100;

                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>{label}</span>
                        <span className="font-bold">${value.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            idx === 0 ? 'bg-green-500' :
                            idx === 1 ? 'bg-yellow-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isInteractive && (
            <button
              onClick={() => handleSendMessage('continue')}
              disabled={isLoading}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Outputs →
            </button>
          )}
        </div>
      );
    }

    // Output generator widget (NEW for Value Quantifier V6) - shadcn/ui inspired cards

    // ── Gamification: Score Card ──
    if (type === 'score_card') {
      const points = data?.points ?? 0;
      const label = data?.label ?? 'Points';
      const title = data?.title ?? 'Score';
      const badges = data?.badges ?? [];
      const subtitle = data?.subtitle ?? '';
      return (
        <div className="my-3 p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/15 dark:to-orange-900/10 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">{title}</h4>
            {badges.length > 0 && (
              <div className="flex gap-1">
                {badges.map((b: string, i: number) => (
                  <span key={i} className="text-lg" title={b}>{b === 'gold' ? '🥇' : b === 'silver' ? '🥈' : b === 'bronze' ? '🥉' : '⭐'}</span>
                ))}
              </div>
            )}
          </div>
          <div className="text-center py-2">
            <div className="text-5xl font-black text-amber-600 dark:text-amber-400 tabular-nums">{points.toLocaleString()}</div>
            <div className="text-sm font-medium text-amber-700/70 dark:text-amber-400/70 mt-1">{label}</div>
            {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</div>}
          </div>
        </div>
      );
    }

    // ── Gamification: Progress Ring ──
    if (type === 'progress_ring') {
      const current = data?.current ?? 0;
      const max = data?.max ?? 100;
      const label = data?.label ?? 'Progress';
      const color = data?.color ?? 'emerald';
      const pct = Math.min(100, Math.round((current / max) * 100));
      const r = 54;
      const circ = 2 * Math.PI * r;
      const offset = circ - (pct / 100) * circ;
      const colorMap: Record<string, string> = {
        emerald: 'stroke-emerald-500', blue: 'stroke-blue-500', purple: 'stroke-purple-500',
        amber: 'stroke-amber-500', rose: 'stroke-rose-500', indigo: 'stroke-indigo-500',
      };
      const textColorMap: Record<string, string> = {
        emerald: 'text-emerald-600 dark:text-emerald-400', blue: 'text-blue-600 dark:text-blue-400',
        purple: 'text-purple-600 dark:text-purple-400', amber: 'text-amber-600 dark:text-amber-400',
        rose: 'text-rose-600 dark:text-rose-400', indigo: 'text-indigo-600 dark:text-indigo-400',
      };
      return (
        <div className="my-3 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md">
          <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">{label}</h4>
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700" />
                <circle cx="60" cy="60" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
                  className={colorMap[color] || 'stroke-emerald-500'}
                  strokeDasharray={circ} strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black tabular-nums ${textColorMap[color] || 'text-emerald-600 dark:text-emerald-400'}`}>{pct}%</span>
                <span className="text-[10px] text-gray-400">{current}/{max}</span>
              </div>
            </div>
          </div>
          {data?.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">{data.subtitle}</p>}
        </div>
      );
    }

    // ── Gamification: Streak Tracker ──
    if (type === 'streak_tracker') {
      const days = data?.days ?? 0;
      const label = data?.label ?? 'Day Streak';
      const icon = data?.icon ?? '🔥';
      const milestone = data?.milestone ?? null;
      const pctToMilestone = milestone ? Math.min(100, Math.round((days / milestone) * 100)) : null;
      return (
        <div className="my-3 p-5 rounded-2xl border-2 border-orange-300 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/15 shadow-md">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{icon}</div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-orange-600 dark:text-orange-400 tabular-nums">{days}</span>
                <span className="text-sm font-medium text-orange-700/70 dark:text-orange-400/70">{label}</span>
              </div>
              {milestone && pctToMilestone !== null && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>Next milestone: {milestone} days</span>
                    <span>{pctToMilestone}%</span>
                  </div>
                  <div className="h-2 bg-orange-200 dark:bg-orange-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full" style={{ width: `${pctToMilestone}%`, transition: 'width 1s ease-out' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Gamification: Achievement Badge ──
    if (type === 'achievement_badge') {
      const title = data?.title ?? 'Achievement Unlocked';
      const icon = data?.icon ?? '⭐';
      const description = data?.description ?? '';
      const rarity = data?.rarity ?? 'common';
      const rarityStyles: Record<string, string> = {
        common: 'border-gray-300 dark:border-gray-600 from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800',
        rare: 'border-blue-400 dark:border-blue-600 from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/15',
        epic: 'border-purple-400 dark:border-purple-600 from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/15',
        legendary: 'border-amber-400 dark:border-amber-500 from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/15',
      };
      const rarityLabel: Record<string, string> = {
        common: 'text-gray-500', rare: 'text-blue-600 dark:text-blue-400',
        epic: 'text-purple-600 dark:text-purple-400', legendary: 'text-amber-600 dark:text-amber-400',
      };
      return (
        <div className={`my-3 p-5 rounded-2xl border-2 bg-gradient-to-br shadow-lg ${rarityStyles[rarity] || rarityStyles.common}`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/80 dark:bg-gray-900/50 flex items-center justify-center text-3xl shadow-inner border border-white/50 dark:border-gray-700">
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 dark:text-white">{title}</h4>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${rarityLabel[rarity] || rarityLabel.common}`}>{rarity}</span>
              </div>
              {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{description}</p>}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      console.log('🛑 [STOP] Aborting AI generation');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setStreamingResponse(false);
    }
  };

  // Trigger AI response without creating a new user message
  // Used for regenerate and edit flows where user message already exists in DB
  const triggerAIResponse = async (messageText: string, conversationId: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setStreamingResponse(true);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      let assistantContent = '';
      let widgetData: any = null;
      const assistantMsgId = `msg_${Date.now()}_assistant`;
      let assistantMessageAdded = false;
      let realAssistantMsgId: string | null = null; // Track real DB ID for Quick Add

      // Get conversation history from tree structure
      const currentConv = conversations[conversationId];
      const messageChain = currentConv?.history ? buildMessageChain(currentConv.history) : [];
      const conversationHistory = messageChain.map(msg => ({ role: msg.role, content: msg.content }));

      // Stream the response
      const stream = apiClient.streamMessage(agentId, messageText, conversationHistory, memoryEnabled, conversationId, abortControllerRef.current.signal, undefined, widgetFormattingEnabled, undefined, memorySettings, activeClientProfileId, viewAsUser?.id);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          assistantContent += chunk.content;

          if (!assistantMessageAdded) {
            useAppStore.setState((state) => {
              const existingConv = state.conversations[conversationId];
              if (!existingConv || !existingConv.history) return state;

              const newMessage = {
                id: assistantMsgId,
                role: 'assistant' as const,
                content: assistantContent,
                timestamp: new Date(),
                agentId,
                widget: undefined as any,
                parentId: existingConv.history.currentId, // Link to current leaf
                childrenIds: [],
                branchIndex: 0,
                siblingCount: 1,
                isEdited: false,
                editedAt: null,
              };

              // Add message to tree
              const newMessages = {
                ...existingConv.history.messages,
                [assistantMsgId]: newMessage,
              };

              // Update parent's childrenIds if parent exists
              if (existingConv.history.currentId && newMessages[existingConv.history.currentId]) {
                const parent = newMessages[existingConv.history.currentId];
                newMessages[existingConv.history.currentId] = {
                  ...parent,
                  childrenIds: [...parent.childrenIds, assistantMsgId],
                };
              }

              return {
                conversations: {
                  ...state.conversations,
                  [conversationId]: {
                    ...existingConv,
                    history: {
                      currentId: assistantMsgId, // Move to new message
                      messages: newMessages,
                    },
                    updatedAt: new Date(),
                  },
                },
              };
            });
            assistantMessageAdded = true;
          } else {
            useAppStore.setState((state) => {
              const existingConv = state.conversations[conversationId];
              if (!existingConv || !existingConv.history) return state;

              const updatedMessage = existingConv.history.messages[assistantMsgId];
              if (!updatedMessage) return state;

              return {
                conversations: {
                  ...state.conversations,
                  [conversationId]: {
                    ...existingConv,
                    history: {
                      ...existingConv.history,
                      messages: {
                        ...existingConv.history.messages,
                        [assistantMsgId]: {
                          ...updatedMessage,
                          content: assistantContent,
                        },
                      },
                    },
                  },
                },
              };
            });
          }
        } else if (chunk.type === 'widget') {
          widgetData = chunk.widget;
          useAppStore.setState((state) => {
            const existingConv = state.conversations[conversationId];
            if (!existingConv || !existingConv.history) return state;

            const updatedMessage = existingConv.history.messages[assistantMsgId];
            if (!updatedMessage) return state;

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...existingConv,
                  history: {
                    ...existingConv.history,
                    messages: {
                      ...existingConv.history.messages,
                      [assistantMsgId]: {
                        ...updatedMessage,
                        widget: widgetData,
                      },
                    },
                  },
                },
              },
            };
          });
        } else if (chunk.type === 'assistant_message_id') {
          const realMessageId = (chunk as any).messageId;
          realAssistantMsgId = realMessageId; // Track for Quick Add options
          console.log(`🔄 [MESSAGE] Replacing assistant message ID ${assistantMsgId} with database ID ${realMessageId}`);

          useAppStore.setState((state) => {
            const existingConv = state.conversations[conversationId];
            if (!existingConv || !existingConv.history) return state;

            const tempMessage = existingConv.history.messages[assistantMsgId];
            if (!tempMessage) return state;

            // Create new messages object with renamed key
            const { [assistantMsgId]: _, ...otherMessages } = existingConv.history.messages;
            const newMessages = {
              ...otherMessages,
              [realMessageId]: {
                ...tempMessage,
                id: realMessageId,
              },
            };

            // Update parent's childrenIds to use new ID
            if (tempMessage.parentId && newMessages[tempMessage.parentId]) {
              const parent = newMessages[tempMessage.parentId];
              newMessages[tempMessage.parentId] = {
                ...parent,
                childrenIds: parent.childrenIds.map(id =>
                  id === assistantMsgId ? realMessageId : id
                ),
              };
            }

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...existingConv,
                  history: {
                    currentId: realMessageId, // Update currentId to real ID
                    messages: newMessages,
                  },
                },
              },
            };
          });
        } else if (chunk.type === 'onboarding_completed') {
          console.log('🎉 [ONBOARDING] Completion detected! Reloading dashboard to unlock agents...');
          // Reload the page to fetch updated agent list with unlocked status
          setTimeout(() => {
            window.location.reload();
          }, 2000); // Wait 2 seconds so user can see the completion message
        } else if (chunk.type === 'quick_add_options') {
          // Backend widget agent extracted Quick Add options (structured JSON)
          const options = (chunk as any).options;
          // Use real message ID if available, otherwise fall back to temp ID
          const targetMsgId = realAssistantMsgId || assistantMsgId;
          console.log('✨ [QUICK_ADD] Received options from backend (triggerAI):', options, '| Target ID:', targetMsgId);

          // Store options in message data
          useAppStore.setState((state) => {
            const existingConv = state.conversations[conversationId];
            if (!existingConv || !existingConv.history) return state;

            const updatedMessage = existingConv.history.messages[targetMsgId];
            if (!updatedMessage) {
              console.warn('⚠️ [QUICK_ADD] Message not found for ID:', targetMsgId);
              return state;
            }

            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...existingConv,
                  history: {
                    ...existingConv.history,
                    messages: {
                      ...existingConv.history.messages,
                      [targetMsgId]: {
                        ...updatedMessage,
                        quickAddOptions: options,
                      },
                    },
                  },
                },
              },
            };
          });

          // Force re-render to show Quick Add buttons
          setMessageUpdateTrigger(prev => prev + 1);
        }
      }

      setIsLoading(false);
      setStreamingResponse(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🛑 [AI] Generation stopped by user');
      } else {
        console.error('Error streaming AI response:', error);
        setErrorMessage('Failed to get AI response. Please try again.');
        setShowError(true);
      }
      setIsLoading(false);
      setStreamingResponse(false);
    }
  };

  // Handle model override change (admin only)
  const handleModelChange = async (newModel: string) => {
    if (userRole !== 'admin' || !propConversationId) return;

    setSelectedModel(newModel);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/conversations/${propConversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ modelOverride: newModel || null })
      });

      if (!response.ok) {
        console.error('Failed to save model override');
      }
    } catch (error) {
      console.error('Error saving model override:', error);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    // Block sending in view-only impersonation mode
    if (isViewOnly) return;

    // Ensure messageText is a string (in case event is passed)
    const textToSend = typeof messageText === 'string' ? messageText : input.trim();
    const userMessage = textToSend.trim();

    // Allow sending if there's either a message or attachments
    if ((!userMessage && attachedFiles.length === 0) || isLoading) return;

    // Upload attachments first if present
    let documentIds: string[] = [];
    if (attachedFiles.length > 0) {
      try {
        documentIds = await uploadAttachments();
      } catch (error) {
        // Error already handled in uploadAttachments
        return;
      }
    }

    setInput('');
    setAttachedFiles([]); // Clear attachments after upload

    // Create conversation if needed (but don't send ID to backend yet for new convos)
    let convId = currentConversationId;
    let isNewConversation = false;

    if (!convId) {
      convId = createConversation(agentId);
      setCurrentConversation(convId);
      isNewConversation = true;
    }

    // Add user message with attachment info
    let messageContent = userMessage || '📎 File attachments';
    if (documentIds.length > 0 && userMessage) {
      messageContent += `\n\n📎 ${documentIds.length} attachment(s) uploaded`;
    } else if (documentIds.length > 0) {
      messageContent = `📎 ${documentIds.length} attachment(s) uploaded`;
    }

    const isFirstMessage = messages.length === 0;

    const userMsg: MessageNode = {
      id: `msg_${Date.now()}_user`,
      role: 'user' as const,
      content: messageContent,
      timestamp: new Date(),
      agentId,
      parentId: messages.length > 0 ? messages[messages.length - 1].id : null,
      childrenIds: [],
      branchIndex: 0,
      siblingCount: 1,
      isEdited: false,
      editedAt: null,
    };
    addMessage(convId, userMsg);

    if (isFirstMessage) {
      try { posthog.capture('agent_first_message', { agent_slug: agentId }); } catch {}
    }

    setIsLoading(true);
    setStreamingResponse(true);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Streaming response
      let assistantContent = '';
      let widgetData: any = null;
      const assistantMsgId = `msg_${Date.now()}_assistant`;
      let assistantMessageAdded = false; // Track if we've added the message yet
      let realAssistantMsgId: string | null = null; // Track real DB ID for Quick Add

      // Get conversation history from tree structure (for the API call)
      const messageChain = currentConversation?.history ? buildMessageChain(currentConversation.history) : [];
      const conversationHistory = messageChain.map(msg => ({ role: msg.role, content: msg.content }));

      // Only send conversationId if this is an EXISTING conversation from the database
      // For new conversations (or temp IDs), let the backend create the ID
      const isTempId = convId?.startsWith('temp_');
      const conversationIdToSend = (isNewConversation || isTempId) ? undefined : convId;

      // If no message but files attached, send a default prompt
      const messageToSend = userMessage || (documentIds.length > 0 ? 'Please analyze the attached document(s) and provide a summary.' : '');

      // Stream the response with conversation history, memory setting, conversationId, documentIds, widgetFormatting, modelOverride, and abort signal
      console.log('🎮 [FRONTEND] Sending message with settings:', {
        widgetFormattingEnabled,
        typeOf: typeof widgetFormattingEnabled,
        memoryEnabled,
        memorySettings: memorySettings,
        agentId,
        modelOverride: selectedModel || 'default'
      });
      const stream = apiClient.streamMessage(agentId, messageToSend, conversationHistory, memoryEnabled, conversationIdToSend, abortControllerRef.current.signal, documentIds.length > 0 ? documentIds : undefined, widgetFormattingEnabled, selectedModel, memorySettings, activeClientProfileId, viewAsUser?.id);

      for await (const chunk of stream) {
        // Handle different chunk types
        if (chunk.type === 'content') {
          assistantContent += chunk.content;

          // Clear status message when AI starts responding
          if (statusMessage) {
            setStatusMessage(null);
          }

          // Add/update assistant message using setState (consistent approach)
          if (!assistantMessageAdded) {
            // First chunk: create message in tree
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId!];
              if (!existingConv || !existingConv.history) return state;

              const newMessage = {
                id: assistantMsgId,
                role: 'assistant' as const,
                content: assistantContent,
                timestamp: new Date(),
                agentId,
                widget: undefined as any,
                parentId: existingConv.history.currentId, // Link to current leaf
                childrenIds: [],
                branchIndex: 0,
                siblingCount: 1,
                isEdited: false,
                editedAt: null,
              };

              const newMessages = {
                ...existingConv.history.messages,
                [assistantMsgId]: newMessage,
              };

              // Update parent's childrenIds
              if (existingConv.history.currentId && newMessages[existingConv.history.currentId]) {
                const parent = newMessages[existingConv.history.currentId];
                newMessages[existingConv.history.currentId] = {
                  ...parent,
                  childrenIds: [...parent.childrenIds, assistantMsgId],
                };
              }

              return {
                conversations: {
                  ...state.conversations,
                  [convId!]: {
                    ...existingConv,
                    history: {
                      currentId: assistantMsgId,
                      messages: newMessages,
                    },
                    updatedAt: new Date(),
                  },
                },
              };
            });
            assistantMessageAdded = true;
          } else {
            // Subsequent chunks: update existing message
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId!];
              if (!existingConv || !existingConv.history) return state;

              const updatedMessage = existingConv.history.messages[assistantMsgId];
              if (!updatedMessage) return state;

              return {
                conversations: {
                  ...state.conversations,
                  [convId!]: {
                    ...existingConv,
                    history: {
                      ...existingConv.history,
                      messages: {
                        ...existingConv.history.messages,
                        [assistantMsgId]: {
                          ...updatedMessage,
                          content: assistantContent,
                        },
                      },
                    },
                  },
                },
              };
            });
          }
        } else if (chunk.type === 'widget') {
          // Store widget data
          widgetData = chunk.widget;
          console.log('📊 [WIDGET] Received from backend:', chunk.widget.type);

          // Update message with widget data
          useAppStore.setState((state) => {
            const existingConv = state.conversations[convId!];
            if (!existingConv || !existingConv.history) return state;

            const updatedMessage = existingConv.history.messages[assistantMsgId];
            if (!updatedMessage) return state;

            return {
              conversations: {
                ...state.conversations,
                [convId!]: {
                  ...existingConv,
                  history: {
                    ...existingConv.history,
                    messages: {
                      ...existingConv.history.messages,
                      [assistantMsgId]: {
                        ...updatedMessage,
                        widget: widgetData,
                      },
                    },
                  },
                },
              },
            };
          });
        } else if (chunk.type === 'conversation_id') {
          // Receive the conversation ID from backend (for new conversations)
          const backendConvId = (chunk as any).conversationId;
          console.log('📝 [CONVERSATION] Received conversation ID from backend:', backendConvId);

          // If we have a temp ID, replace it with the real database ID
          if (isTempId && backendConvId && backendConvId !== convId) {
            console.log(`🔄 [CONVERSATION] Replacing temp ID ${convId} with database ID ${backendConvId}`);

            // Get the current conversation data
            const tempConversation = useAppStore.getState().conversations[convId];

            if (tempConversation) {
              // Remove temp conversation and add with real ID
              useAppStore.setState((state) => {
                const { [convId!]: removed, ...remainingConversations } = state.conversations;
                return {
                  conversations: {
                    ...remainingConversations,
                    [backendConvId]: {
                      ...tempConversation,
                      id: backendConvId,
                    },
                  },
                  currentConversationId: backendConvId,
                };
              });

              // Update local convId reference for subsequent messages
              convId = backendConvId;
            }
          }
        } else if (chunk.type === 'conversation_title') {
          // Haiku auto-generated conversation title — update sidebar
          const newTitle = (chunk as any).title;
          const titleConvId = (chunk as any).conversationId || convId;
          console.log(`✏️ [CONVERSATION] Auto-named: "${newTitle}"`);
          useAppStore.setState((state) => {
            const conv = state.conversations[titleConvId];
            if (!conv) return state;
            return {
              conversations: {
                ...state.conversations,
                [titleConvId]: { ...conv, title: newTitle },
              },
            };
          });
        } else if (chunk.type === 'user_message_id') {
          // Replace temporary user message ID with real database UUID
          const realMessageId = (chunk as any).messageId;
          const tempUserId = userMsg.id;
          console.log(`🔄 [MESSAGE] Replacing user message ID ${tempUserId} with database ID ${realMessageId}`);
          console.log(`🔍 [DEBUG] Is valid UUID before: ${isValidUUID(tempUserId)}, after: ${isValidUUID(realMessageId)}`);

          // Update local reference
          userMsg.id = realMessageId;

          // Update store with new UUID - rename key in tree
          useAppStore.setState((state) => {
            const existingConv = state.conversations[convId!];
            if (!existingConv || !existingConv.history) return state;

            const tempMessage = existingConv.history.messages[tempUserId];
            if (!tempMessage) return state;

            // Remove temp key, add with real key
            const { [tempUserId]: _, ...otherMessages } = existingConv.history.messages;
            const newMessages = {
              ...otherMessages,
              [realMessageId]: {
                ...tempMessage,
                id: realMessageId,
              },
            };

            // Update parent's childrenIds if exists
            if (tempMessage.parentId && newMessages[tempMessage.parentId]) {
              const parent = newMessages[tempMessage.parentId];
              newMessages[tempMessage.parentId] = {
                ...parent,
                childrenIds: parent.childrenIds.map(id =>
                  id === tempUserId ? realMessageId : id
                ),
              };
            }

            // Update assistant message's parentId if it points to temp ID
            if (newMessages[assistantMsgId] && newMessages[assistantMsgId].parentId === tempUserId) {
              newMessages[assistantMsgId] = {
                ...newMessages[assistantMsgId],
                parentId: realMessageId,
              };
            }

            return {
              conversations: {
                ...state.conversations,
                [convId!]: {
                  ...existingConv,
                  history: {
                    ...existingConv.history,
                    messages: newMessages,
                  },
                },
              },
            };
          });

          // Force re-render to show edit button immediately
          setMessageUpdateTrigger(prev => prev + 1);

          console.log(`✅ [MESSAGE] User message ID updated successfully - edit button should now be visible`);
        } else if (chunk.type === 'assistant_message_id') {
          // Replace temporary assistant message ID with real database UUID
          const realMessageId = (chunk as any).messageId;
          realAssistantMsgId = realMessageId; // Track for Quick Add options
          console.log(`🔄 [MESSAGE] Replacing assistant message ID ${assistantMsgId} with database ID ${realMessageId}`);

          useAppStore.setState((state) => {
            const existingConv = state.conversations[convId!];
            if (!existingConv || !existingConv.history) return state;

            const tempMessage = existingConv.history.messages[assistantMsgId];
            if (!tempMessage) return state;

            // Remove temp key, add with real key
            const { [assistantMsgId]: _, ...otherMessages } = existingConv.history.messages;
            const newMessages = {
              ...otherMessages,
              [realMessageId]: {
                ...tempMessage,
                id: realMessageId,
              },
            };

            // Update parent's childrenIds
            if (tempMessage.parentId && newMessages[tempMessage.parentId]) {
              const parent = newMessages[tempMessage.parentId];
              newMessages[tempMessage.parentId] = {
                ...parent,
                childrenIds: parent.childrenIds.map(id =>
                  id === assistantMsgId ? realMessageId : id
                ),
              };
            }

            return {
              conversations: {
                ...state.conversations,
                [convId!]: {
                  ...existingConv,
                  history: {
                    currentId: realMessageId, // Update to real ID
                    messages: newMessages,
                  },
                },
              },
            };
          });

          // Force re-render to show regenerate button immediately
          setMessageUpdateTrigger(prev => prev + 1);
        } else if (chunk.type === 'quick_add_options') {
          // Backend widget agent extracted Quick Add options (structured JSON)
          const options = (chunk as any).options;
          // Use real message ID if available, otherwise fall back to temp ID
          const targetMsgId = realAssistantMsgId || assistantMsgId;
          console.log('✨ [QUICK_ADD] Received options from backend:', options, '| Target ID:', targetMsgId);

          // Store options in message data (don't modify message content)
          useAppStore.setState((state) => {
            const existingConv = state.conversations[convId!];
            if (!existingConv || !existingConv.history) return state;

            const updatedMessage = existingConv.history.messages[targetMsgId];
            if (!updatedMessage) {
              console.warn('⚠️ [QUICK_ADD] Message not found for ID:', targetMsgId);
              return state;
            }

            return {
              conversations: {
                ...state.conversations,
                [convId!]: {
                  ...existingConv,
                  history: {
                    ...existingConv.history,
                    messages: {
                      ...existingConv.history.messages,
                      [targetMsgId]: {
                        ...updatedMessage,
                        quickAddOptions: options, // Store options separately
                      },
                    },
                  },
                },
              },
            };
          });

          // Force re-render to show Quick Add buttons
          setMessageUpdateTrigger(prev => prev + 1);
        } else if (chunk.type === 'format_update') {
          // DEPRECATED: Old widget formatter (now using quick_add_options instead)
          console.log('⚠️ [WIDGET] Received old format_update - ignoring (use quick_add_options)');
        } else if (chunk.type === 'status') {
          // Status updates from backend — log only, don't show to users
          // Users see the typing indicator instead
          const statusMsg = (chunk as any).message || '';
          console.log(`📊 [STATUS] ${statusMsg}`);
        } else if (chunk.type === 'context_warning') {
          // Long conversation warning — append to assistant message as a hint
          const warningMsg = (chunk as any).message || '';
          const level = (chunk as any).level || 'mild';
          console.log(`⚠️ [CONTEXT_WARNING] ${level}: ${warningMsg}`);
          if (warningMsg) {
            assistantContent += `\n\n---\n${warningMsg}`;
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId!];
              if (!existingConv?.history?.messages?.[assistantMsgId]) return state;
              return {
                ...state,
                conversations: { ...state.conversations, [convId!]: {
                  ...existingConv,
                  history: { ...existingConv.history, messages: { ...existingConv.history.messages, [assistantMsgId]: {
                    ...existingConv.history.messages[assistantMsgId],
                    content: assistantContent
                  }}}
                }}
              };
            });
            setMessageUpdateTrigger(prev => prev + 1);
          }
        } else if (chunk.type === 'error') {
          // Handle API errors from backend
          const errorMessage = (chunk as any).error || (chunk as any).content || 'An error occurred';
          const statusCode = (chunk as any).statusCode;

          console.error(`❌ [ERROR] Received error from backend (${statusCode}):`, errorMessage);

          // Update assistant message with error content
          assistantContent = errorMessage;

          if (!assistantMessageAdded) {
            // Add error message to conversation tree
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId!];
              if (!existingConv || !existingConv.history) return state;

              const newMessage: MessageNode = {
                id: assistantMsgId,
                role: 'assistant' as const,
                content: errorMessage,
                timestamp: new Date(),
                agentId,
                widget: undefined as any,
                parentId: existingConv.history.currentId,
                childrenIds: [],
                branchIndex: 0,
                siblingCount: 1,
                isEdited: false,
                editedAt: null,
              };

              const newMessages = {
                ...existingConv.history.messages,
                [assistantMsgId]: newMessage,
              };

              // Update parent's childrenIds if parentId exists
              if (newMessage.parentId && newMessages[newMessage.parentId]) {
                newMessages[newMessage.parentId] = {
                  ...newMessages[newMessage.parentId],
                  childrenIds: [...newMessages[newMessage.parentId].childrenIds, assistantMsgId],
                };
              }

              return {
                conversations: {
                  ...state.conversations,
                  [convId!]: {
                    ...existingConv,
                    history: {
                      ...existingConv.history,
                      messages: newMessages,
                      currentId: assistantMsgId,
                    },
                    updatedAt: new Date(),
                  },
                },
              };
            });
            assistantMessageAdded = true;
          } else {
            // Update existing message with error in tree
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId!];
              if (!existingConv || !existingConv.history) return state;

              const updatedMessages = {
                ...existingConv.history.messages,
                [assistantMsgId]: {
                  ...existingConv.history.messages[assistantMsgId],
                  content: errorMessage,
                },
              };

              return {
                conversations: {
                  ...state.conversations,
                  [convId!]: {
                    ...existingConv,
                    history: {
                      ...existingConv.history,
                      messages: updatedMessages,
                    },
                  },
                },
              };
            });
          }

          // Show error to user
          setErrorMessage(errorMessage);
          setShowError(true);
        }
      }

      // After streaming completes, check for STRUCTURED_DATA (onboarding completion)
      // Handles multiple formats: <STRUCTURED_DATA>...</STRUCTURED_DATA>, ```STRUCTURED_DATA:...```, STRUCTURED_DATA: {...}
      if (agentId === 'client-onboarding' && (assistantContent.includes('STRUCTURED_DATA:') || assistantContent.includes('<STRUCTURED_DATA>'))) {
        console.log('🎯 [ONBOARDING] Detected STRUCTURED_DATA in response');

        try {
          // Try multiple extraction patterns
          let jsonData = null;

          // Pattern 1: XML-style tags <STRUCTURED_DATA>{ ... }</STRUCTURED_DATA>
          let match = assistantContent.match(/<STRUCTURED_DATA>\s*([\s\S]*?)\s*<\/STRUCTURED_DATA>/);
          if (match) {
            console.log('📋 [ONBOARDING] Using XML tag format');
            jsonData = JSON.parse(match[1].trim());
          }

          // Pattern 2: Triple backticks with newlines ```STRUCTURED_DATA:\n{ ... }\n```
          if (!jsonData) {
            match = assistantContent.match(/```\s*STRUCTURED_DATA:\s*\n([\s\S]*?)\n```/);
            if (match) {
              console.log('📋 [ONBOARDING] Using triple-backtick format');
              jsonData = JSON.parse(match[1]);
            }
          }

          // Pattern 3: Inline format STRUCTURED_DATA: { ... } (single line or multiline)
          if (!jsonData) {
            match = assistantContent.match(/STRUCTURED_DATA:\s*(\{[\s\S]*?\})/);
            if (match) {
              console.log('📋 [ONBOARDING] Using inline format');
              jsonData = JSON.parse(match[1]);
            }
          }

          if (jsonData) {
            console.log('📊 [ONBOARDING] Parsed JSON data:', jsonData);

            // Handle both flat format and nested { profile: { ... } } format
            const profileData = jsonData.profile || jsonData;
            const isComplete = jsonData.onboarding_complete === true || profileData.full_name || profileData.company_name || profileData.business_outcome;

            // If we have structured data with required fields, onboarding is complete
            if (isComplete) {
              console.log('✅ [ONBOARDING] Onboarding completion detected, extracting conversation data...');

              // Use the profile data directly as core memories
              const coreMemories: any = {
                full_name: profileData.full_name || '',
                company_name: profileData.company_name || '',
                business_outcome: profileData.business_outcome || '',
                target_clients: profileData.target_clients || '',
                client_problems: profileData.client_problems || '',
                client_results: profileData.client_results || '',
                core_method: profileData.core_method || '',
                frameworks: profileData.frameworks || '',
                service_description: profileData.service_description || '',
                pricing_model: profileData.pricing_model || '',
                delivery_timeline: profileData.delivery_timeline || '',
                revenue_range: profileData.revenue_range || '',
                growth_goals: profileData.growth_goals || '',
                biggest_challenges: profileData.biggest_challenges || ''
              };

              // Remove empty fields
              Object.keys(coreMemories).forEach(key => {
                if (!coreMemories[key]) delete coreMemories[key];
              });

              console.log('📊 [ONBOARDING] Extracted core memories:', Object.keys(coreMemories));

              // Call onboarding completion endpoint
              const token = localStorage.getItem('accessToken');
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/onboarding/complete`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ coreMemories }),
                }
              );

              if (response.ok) {
                const result = await response.json();
                console.log('✅ [ONBOARDING] Successfully marked onboarding as complete');
                console.log('✅ [ONBOARDING] Core memories saved:', Object.keys(coreMemories).length, 'fields');

                // Show success message to user
                alert('🎉 Onboarding Complete!\n\nAll MindsetOS agents are now unlocked and available.\n\nThe page will refresh in a moment to show your available agents.');

                // Force page reload to refresh agent list - use location.href for more reliable reload
                setTimeout(() => {
                  console.log('🔄 [ONBOARDING] Reloading page to refresh agent list...');
                  window.location.href = window.location.pathname;
                }, 2000);
              } else {
                const errorData = await response.json();
                console.error('❌ [ONBOARDING] Failed to complete onboarding:', errorData);
                console.error('❌ [ONBOARDING] Response status:', response.status);
                alert('Failed to complete onboarding. Please try again or contact support.\n\nError: ' + (errorData.error || 'Unknown error'));
              }
            }
          } else {
            console.log('❌ [ONBOARDING] Could not parse STRUCTURED_DATA from response');
          }
        } catch (error) {
          console.error('❌ [ONBOARDING] Error parsing STRUCTURED_DATA:', error);
          console.error('❌ [ONBOARDING] Assistant content:', assistantContent);
        }
      }

      // After streaming completes, check for agent-create block (Agent Creator agent)
      if (agentId === 'agent-creator' && assistantContent.includes('```agent-create')) {
        console.log('🤖 [AGENT-CREATOR] Detected agent-create block in response');
        try {
          const agentMatch = assistantContent.match(/```agent-create\s*\n([\s\S]*?)\n```/);
          if (agentMatch) {
            const agentData = JSON.parse(agentMatch[1].trim());
            console.log('🤖 [AGENT-CREATOR] Parsed agent data:', agentData);

            if (agentData.name && agentData.systemPrompt) {
              try {
                const created = await createCustomAgent({
                  name: agentData.name,
                  description: agentData.description || '',
                  systemPrompt: agentData.systemPrompt,
                  category: agentData.category || 'custom',
                  color: agentData.color || '#8b5cf6',
                  conversationStarters: agentData.conversationStarters || ["Let's GO!"],
                  icon: agentData.icon || 'Wand2',
                  visibility: 'private',
                  clientProfileId: activeClientProfileId,
                });
                console.log('✅ [AGENT-CREATOR] Custom agent created:', created.id, created.name);
                setErrorMessage(`✅ Agent "${created.name}" created! Find it in My Agents or the agent browser.`);
                setShowError(true);
              } catch (createErr) {
                console.error('❌ [AGENT-CREATOR] Failed to create agent:', createErr);
                setErrorMessage(`Failed to create agent: ${createErr instanceof Error ? createErr.message : 'Unknown error'}`);
                setShowError(true);
              }
            }
          }
        } catch (error) {
          console.error('❌ [AGENT-CREATOR] Error parsing agent-create block:', error);
        }
      }

      // After streaming completes, check for new memories
      if (convId && assistantMsgId) {
        await checkForNewMemories(convId, assistantMsgId);
      }

      // Reset retry count on successful message
      setRetryCount(0);

      // Explicit scroll after streaming completes and options render
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      // Check if error is from abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 [STOP] Generation stopped by user');
        // Don't show error message for user-initiated stops
      } else {
        console.error('Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        // Check if it's a network/stream error (502, connection failed, etc.)
        const isNetworkError = errorMessage.includes('502') ||
                                errorMessage.includes('Failed to fetch') ||
                                errorMessage.includes('Stream failed') ||
                                errorMessage.includes('ERR_FAILED');

        setLastFailedMessage(userMessage);
        setShowError(true);
        setErrorMessage(isNetworkError
          ? 'Connection error. The message will be retried automatically...'
          : errorMessage);

        // Auto-retry for network errors (with exponential backoff)
        if (isNetworkError && retryCount < MAX_RETRIES) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 8000); // 1s, 2s, 4s, max 8s
          console.log(`🔄 Network error detected, retry ${retryCount + 1}/${MAX_RETRIES} in ${retryDelay}ms...`);

          // Remove the failed user message before retrying to prevent duplicates
          if (convId) {
            useAppStore.setState((state) => {
              const existingConv = state.conversations[convId];
              if (!existingConv || !existingConv.history) return state;

              const messageToRemove = existingConv.history.messages[userMsg.id];
              if (!messageToRemove) return state;

              // Create new messages object without the failed message
              const { [userMsg.id]: removed, ...remainingMessages } = existingConv.history.messages;

              // Update parent's childrenIds if parent exists
              if (messageToRemove.parentId && remainingMessages[messageToRemove.parentId]) {
                remainingMessages[messageToRemove.parentId] = {
                  ...remainingMessages[messageToRemove.parentId],
                  childrenIds: remainingMessages[messageToRemove.parentId].childrenIds.filter(
                    id => id !== userMsg.id
                  ),
                };
              }

              return {
                conversations: {
                  ...state.conversations,
                  [convId]: {
                    ...existingConv,
                    history: {
                      ...existingConv.history,
                      messages: remainingMessages,
                      currentId: existingConv.history.currentId === userMsg.id
                        ? messageToRemove.parentId
                        : existingConv.history.currentId,
                    },
                  },
                },
              };
            });
          }

          setRetryCount(retryCount + 1);
          setTimeout(() => {
            console.log(`🔄 Retrying message (attempt ${retryCount + 1})...`);
            setShowError(false);
            handleSendMessage(userMessage);
          }, retryDelay);
        } else if (isNetworkError && retryCount >= MAX_RETRIES) {
          // Max retries reached
          console.error('❌ Max retries reached, giving up');
          setRetryCount(0); // Reset for next message
          const errorMsg: MessageNode = {
            id: `msg_${Date.now()}_error`,
            role: 'assistant' as const,
            content: `❌ Connection error: Failed after ${MAX_RETRIES} attempts. The backend may be temporarily unavailable. Please try again in a moment.`,
            timestamp: new Date(),
            agentId,
            parentId: messages.length > 0 ? messages[messages.length - 1].id : null,
            childrenIds: [],
            branchIndex: 0,
            siblingCount: 1,
            isEdited: false,
            editedAt: null,
          };
          if (convId) addMessage(convId, errorMsg);
        } else {
          // Add error message for non-network errors
          const errorMsg: MessageNode = {
            id: `msg_${Date.now()}_error`,
            role: 'assistant' as const,
            content: `❌ Error: ${errorMessage}\n\nClick the "Retry" button to try again.`,
            timestamp: new Date(),
            agentId,
            parentId: messages.length > 0 ? messages[messages.length - 1].id : null,
            childrenIds: [],
            branchIndex: 0,
            siblingCount: 1,
            isEdited: false,
            editedAt: null,
          };
          if (convId) addMessage(convId, errorMsg);
        }
      }
    } finally {
      setIsLoading(false);
      setStreamingResponse(false);
      setStatusMessage(null); // Clear any status message
      abortControllerRef.current = null; // Clean up controller
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handler functions for memory notifications
  const handleUndoMemory = async (memoryId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, {
        method: 'DELETE',
      });
      removeRecentMemory(memoryId);
    } catch (error) {
      console.error('Failed to undo memory:', error);
    }
  };

  const handleEditMemory = async (
    memoryId: string,
    newContent: string,
    newImportance: number
  ) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent,
          importance_score: newImportance,
        }),
      });
    } catch (error) {
      console.error('Failed to edit memory:', error);
    }
  };

  const handleTagMemory = async (memoryId: string, tags: string[]) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010'}/api/memory/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags: tags.join(','),
        }),
      });
    } catch (error) {
      console.error('Failed to tag memory:', error);
    }
  };

  // Get agent data and starter prompts
  const agentData = MINDSET_AGENTS[agentId as keyof typeof MINDSET_AGENTS];
  // Use conversation starters from API if available, otherwise fall back to hardcoded
  // Don't show default until API data is loaded to prevent "Let's GO!" flashing before real starters
  const starterPrompts = agentDataFromAPI?.conversationStarters || agentData?.starterPrompts || [];

  // Agent accent hex for UI theming
  const agentHex = AGENT_HEX[agentId] || '#6366f1';

  // Handler for using context suggestion
  const handleUseContext = (message: string) => {
    setInput(message);
    setShowSuggestion(false);
    textareaRef.current?.focus();
  };

  const handleDismissSuggestion = () => {
    setShowSuggestion(false);
  };

  return (
    <div className="flex flex-col h-full chat-area-bg">
      {/* Agent context bar — shown once conversation is active */}
      {messages.length > 0 && (agentDataFromAPI?.name || agentData?.name) && (
        <div
          className="flex items-center gap-2.5 px-4 py-2 border-b flex-shrink-0"
          style={{
            background: 'rgba(9,9,15,0.92)',
            borderColor: '#1e1e30',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: agentHex,
              boxShadow: `0 0 6px ${agentHex}`,
            }}
          />
          <span className="text-xs font-semibold" style={{ color: '#ededf5' }}>
            {agentDataFromAPI?.name || agentData?.name}
          </span>
          <span className="text-xs" style={{ color: '#9090a8' }}>· Active</span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-4 sm:space-y-6 chat-content-layer">
        {/* Conversation Stats - Hidden from user view (admin only in /admin/analytics) */}
        {/* {currentConversationId && <ConversationStats conversationId={currentConversationId} />} */}

        {/* Memory Context Suggestion */}
        {showSuggestion && contextSuggestion && (
          <MemoryContextSuggestion
            contextMessage={contextSuggestion.message}
            memoryCount={contextSuggestion.memoryCount}
            onUseContext={handleUseContext}
            onDismiss={handleDismissSuggestion}
          />
        )}

        {/* Imported Memory Preview */}
        {importedMemory && importedMemory.items.length > 0 && (
          <MemoryPreviewPanel
            importedMemory={importedMemory.items}
            onMemoryUpdate={(updatedItems) => {
              setImportedMemory({
                ...importedMemory,
                items: updatedItems,
                lastUpdated: new Date(),
              });
            }}
            onConfirm={confirmMemory}
          />
        )}

        {/* Error Banner with Retry Button */}
        {showError && (
          <div className="flex justify-center my-4">
            <div className="px-6 py-4 chat-error-banner rounded-xl max-w-2xl w-full">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-red-400 text-base font-semibold mb-2">
                    Something went wrong
                  </p>
                  <p className="text-red-300/80 text-sm mb-3">
                    {errorMessage || "An error occurred. Please try again."}
                  </p>
                  {lastFailedMessage && (
                    <p className="text-gray-400 text-xs italic bg-black/20 px-3 py-2 rounded-lg border border-white/05">
                      "{lastFailedMessage.substring(0, 150)}{lastFailedMessage.length > 150 ? "..." : ""}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {lastFailedMessage && (
                    <button
                      onClick={() => {
                        setShowError(false);
                        setInput(lastFailedMessage);
                        setLastFailedMessage(null);
                      }}
                      className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                      title="Retry this message"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => setShowError(false)}
                    className="px-4 py-2 bg-white/08 hover:bg-white/12 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center mt-8 sm:mt-20 max-w-lg mx-auto px-2 animate-float-up-1">
            <div className="mb-10">
              {/* MindsetOS Logo for default agents */}
              {(agentId === 'general' || agentId === 'mindset-super-agent' || agentId === 'client-onboarding') ? (
                <div className="mb-7 flex justify-center">
                  <MindsetOSLogo size="lg" />
                </div>
              ) : (
                <div
                  className="mb-7 mx-auto flex items-center justify-center"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: `${agentHex}18`,
                    border: `1.5px solid ${agentHex}35`,
                    boxShadow: `0 0 32px ${agentHex}12`,
                  }}
                >
                  <AgentIcon agentId={agentId} className="w-8 h-8" style={{ color: agentHex }} />
                </div>
              )}

              {/* Custom greeting for default agents */}
              {(agentId === 'general' || agentId === 'mindset-super-agent') ? (
                <>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight chat-welcome-headline">
                    What's running your mind right now?
                  </h2>
                  <p className="text-base mb-5 leading-relaxed" style={{ color: '#9090a8' }}>
                    MindsetOS helps you stop reacting and start designing how you think. Not sure where to begin? The Mindset Score takes 3 minutes and tells you exactly where to focus.
                  </p>
                  {/* Mindset Score CTA card */}
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.href = '/dashboard?agent=mindset-score';
                      }
                    }}
                    className="flex items-center gap-3 w-full max-w-sm mx-auto mb-6 px-4 py-3.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] group"
                    style={{
                      background: 'linear-gradient(135deg, rgba(252,200,36,0.12), rgba(245,158,11,0.08))',
                      border: '1.5px solid rgba(252,200,36,0.35)',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#fcc82420', border: '1px solid #fcc82440' }}
                    >
                      <BarChart2 className="w-5 h-5" style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: '#ededf5' }}>Mindset Score — Free</p>
                      <p className="text-xs" style={{ color: '#9090a8' }}>5 questions &middot; 3 minutes &middot; know where you stand</p>
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-all flex-shrink-0" style={{ color: '#9090a8' }} />
                  </button>
                </>
              ) : agentId === 'client-onboarding' ? (
                <>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight chat-welcome-headline">
                    Welcome to MindsetOS
                  </h2>
                  <p className="text-base mb-8 leading-relaxed" style={{ color: '#9090a8' }}>
                    Let's personalize your experience. I'll ask a few quick questions to personalize your experience.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold mb-3 tracking-tight chat-welcome-headline flex items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: agentHex }} />
                    {agentData?.name}
                  </h2>
                  <p className="text-base mb-5 leading-relaxed" style={{ color: '#9090a8' }}>{agentData?.description}</p>
                </>
              )}
            </div>

            {/* Starter Prompts - Simplified for onboarding */}
            <div className="space-y-3 animate-float-up-2">
              {agentId === 'client-onboarding' ? (
                /* Single button for onboarding */
                <button
                  onClick={() => handleSendMessage("Let's get started with onboarding!")}
                  disabled={isLoading}
                  className="send-btn w-full px-6 py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Sparkles className="w-5 h-5 flex-shrink-0" />
                    <span className="text-base font-bold">Get Started</span>
                  </div>
                </button>
              ) : isVoiceAgent ? (
                /* Voice Call button for voice agents */
                <button
                  onClick={() => setShowVoiceChat(true)}
                  className="w-full px-6 py-4 bg-gradient-to-r from-emerald-700/80 to-teal-700/80 border border-emerald-500/25 rounded-xl hover:from-emerald-600/80 hover:to-teal-600/80 transition-all text-center shadow-lg"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Phone className="w-5 h-5 text-white flex-shrink-0" />
                    <span className="text-base font-bold text-white">Start Voice Session</span>
                  </div>
                  <p className="text-xs text-white/50 mt-1.5">Real-time AI voice conversation</p>
                </button>
              ) : (
                /* Regular starter prompts for other agents */
                <>
                  <p className="text-xs uppercase tracking-widest font-semibold flex items-center justify-center gap-2 mb-5" style={{ color: '#9090a8' }}>
                    <Sparkles className="w-3 h-3 text-amber-500/60" />
                    Begin here
                  </p>
                  {starterPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                      className="starter-prompt-card w-full px-5 py-3.5 rounded-xl text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderLeft: `2px solid ${agentHex}50` }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 flex-shrink-0 transition-colors duration-200" style={{ color: `${agentHex}60` }} />
                        <span className="text-sm font-medium transition-colors duration-200" style={{ color: '#9090a8' }}>
                          {prompt}
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {agentId !== 'client-onboarding' && !isVoiceAgent && (
              <p className="text-xs mt-7 tracking-wide" style={{ color: '#9090a8' }}>
                or type your own message below
              </p>
            )}
          </div>
        )}

        {messages.map((message, messageIndex) => {
          // Find memories associated with this message
          const messageMemories = recentMemories.filter(
            (m) => m.messageId === message.id && m.conversationId === currentConversationId
          );

          // Check if this is the LAST assistant message (for interactive widgets)
          const assistantMessages = messages.filter(m => m.role === 'assistant');
          const isLastAssistantMessage = message.role === 'assistant' &&
                                         assistantMessages[assistantMessages.length - 1]?.id === message.id;

          // Check for Quick Add options from backend (structured JSON from widget agent)
          const isMessageComplete = message.role === 'assistant' && !isStreamingResponse;
          const hasBackendWidget = message.widget && message.widget.type;

          // NEW: Use quickAddOptions from backend widget agent (no frontend parsing needed)
          const quickAddOptions = (message as any).quickAddOptions as string[] | undefined;

          return (
            <div key={message.id}>
              {/* Message */}
              <div
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } message-fade-in`}
              >
                <div
                  className={`max-w-[90vw] sm:max-w-3xl rounded-2xl px-5 sm:px-6 py-4 group ${
                    message.role === 'user'
                      ? 'msg-user text-white font-medium'
                      : ('msg-agent text-[#ededf5] ' + (isStreamingResponse && isLastAssistantMessage ? 'msg-agent-streaming' : ''))
                  }`}
                  style={message.role === 'assistant' ? { borderLeft: `3px solid ${agentHex}30` } : undefined}
                >
                  {message.role === 'assistant' ? (
                    <div className="space-y-4">
                      {/* Content - render FULL message content (no parsing/splitting) */}
                      <div className="chat-prose prose prose-base prose-invert max-w-none leading-relaxed prose-p:my-2.5 prose-p:leading-7 prose-strong:font-bold prose-ul:my-2 prose-li:my-1 prose-h1:text-xl prose-h1:font-bold prose-h1:mb-3 prose-h1:mt-4 prose-h2:text-xl prose-h2:font-bold prose-h2:mb-2 prose-h2:mt-3 prose-h3:text-base prose-h3:font-semibold prose-h3:mb-2 prose-h3:mt-3 prose-hr:my-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanStructuredOutput(message.content, widgetFormattingEnabled)}</ReactMarkdown>
                      </div>

                      {/* Message Actions — appear on hover, subtle */}
                      {!isStreamingResponse && (
                        <div className="flex items-center gap-0.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {/* Copy button */}
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="msg-action-btn"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Thumbs up */}
                          <button
                            onClick={() => handleFeedback(message.id, 'up')}
                            className={`msg-action-btn ${messageFeedback[message.id] === 'up' ? 'text-emerald-400' : ''}`}
                            title="Good response"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Thumbs down */}
                          <button
                            onClick={() => handleFeedback(message.id, 'down')}
                            className={`msg-action-btn ${messageFeedback[message.id] === 'down' ? 'text-red-400' : ''}`}
                            title="Bad response"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Regenerate button */}
                          {message.role === 'assistant' && isValidUUID(message.id) && (
                            <button
                              onClick={() => handleRegenerateMessage(message.id)}
                              className="msg-action-btn"
                              title="Regenerate response"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Open in Playbook */}
                          {canvasEnabled && message.content.length > 100 && (
                            <button
                              onClick={() => openCanvas(message.content, message.id, agentId)}
                              className="msg-action-btn hover:text-amber-400"
                              title="Save as Play"
                            >
                              <PanelRightOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* User message content */}
                      <div className="prose prose-base prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-h1:text-xl prose-h1:font-bold prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold prose-strong:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>

                      {/* Edit button for user messages - HIDDEN FOR DEMO */}
                      {/* <div className={`flex items-center gap-2 mt-2 ${!isValidUUID(message.id) ? 'invisible' : ''}`}>
                        <button
                          onClick={() => setEditingMessage({ id: message.id, content: message.content })}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-gray-500 dark:text-gray-400"
                          title="Edit message"
                          disabled={!isValidUUID(message.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Inline Fork Navigation - Show when message has multiple branches */}
                        {/* {message.siblingCount !== undefined && message.siblingCount > 0 && (
                          <ForkNavigation
                            messageId={message.id}
                            currentBranchIndex={message.branchIndex || 0}
                            totalBranches={(message.siblingCount || 0) + 1}
                            onBranchChange={(newIndex) => handleBranchChange(message.id, newIndex)}
                            compact={true}
                          />
                        )}
                      </div> */}
                    </div>
                  )}
                </div>
              </div>

              {/* Memory notifications for assistant messages */}
              {message.role === 'assistant' && messageMemories.length > 0 && (
                <div className="mt-4">
                  {messageMemories.map((memory) => (
                    <MemoryNotification
                      key={memory.id}
                      memory={memory}
                      onUndo={handleUndoMemory}
                      onEdit={handleEditMemory}
                      onTag={handleTagMemory}
                    />
                  ))}
                </div>
              )}

              {/* Quick Add (renders BELOW the message) - Uses structured options from backend */}
              {message.role === 'assistant' && (quickAddOptions?.length >= 2 || hasBackendWidget) && isLastAssistantMessage && widgetFormattingEnabled && (
                <div className="mt-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-1 py-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">Respond</span>
                  </div>

                  {/* Quick Add Options from Backend Widget Agent */}
                  <div>
                    <div className="space-y-4">
                      {/* Backend widgets (legacy) */}
                      {hasBackendWidget && renderBackendWidget(message.widget, isLastAssistantMessage, message.id)}

                      {/* Quick Add options from backend widget agent (structured JSON) */}
                      {quickAddOptions && quickAddOptions.length >= 2 && (
                        <div className="grid grid-cols-1 gap-3">
                          {quickAddOptions.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => isLastAssistantMessage && handleSendMessage(option)}
                              disabled={isLoading || !isLastAssistantMessage}
                              className="quick-add-btn w-full px-4 py-3 rounded-xl text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-start gap-3">
                                <span className="font-bold text-sm flex-shrink-0 mt-0.5 tabular-nums" style={{ color: 'rgba(252,200,36,0.6)' }}>
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-medium leading-relaxed" style={{ color: '#ededf5' }}>
                                  {option}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isStreamingResponse && (
          <div className="flex justify-start message-fade-in">
            <div className="msg-agent rounded-2xl px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area p-3 sm:p-6 pb-[env(safe-area-inset-bottom,12px)] sm:pb-6">
        <div className="max-w-4xl mx-auto">
          {/* File attachment previews */}
          {attachedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/07 px-3 py-2 rounded-lg border border-white/10"
                >
                  <span className="text-lg">{getFileIcon(file.type)}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[150px] truncate">{file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Model Override (Admin Only) */}
          {userRole === 'admin' && propConversationId && Object.keys(availableModels).length > 0 && (
            <div className="mb-3 px-1">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                🔧 Admin: Override AI Model for this conversation
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={loadingModels || isLoading}
                className="w-full p-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
              >
                <option value="">Use Agent Default Model</option>
                {Object.entries(availableModels)
                  .sort((a, b) => a[1].modelName.localeCompare(b[1].modelName))
                  .map(([modelId, model]) => (
                    <option key={modelId} value={modelId}>
                      {model.modelName}
                    </option>
                  ))}
              </select>
              {selectedModel && (
                <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Overriding agent default - this affects only this conversation
                </div>
              )}
            </div>
          )}

          {/* Status Message Indicator (e.g., summarization progress) */}
          {statusMessage && (
            <div className="mb-3 px-4 py-2.5 bg-white/04 border border-white/08 rounded-xl flex items-start gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300 whitespace-pre-line">{statusMessage}</div>
            </div>
          )}

          {/* Starter prompt chips — only shown when conversation is fresh */}
          {messages.length === 0 && starterPrompts.length > 0 && !isVoiceAgent && agentId !== 'client-onboarding' && (
            <div className="pb-3 flex flex-wrap gap-2">
              {starterPrompts.map((prompt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#1e1e30] bg-[#12121f] text-[#9090a8] hover:text-[#ededf5] hover:border-[#fcc824]/40 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 sm:gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Paperclip button - File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploading}
              className="min-w-[44px] px-3 sm:px-4 py-3 sm:py-4 bg-white/06 text-gray-400 rounded-xl hover:bg-white/10 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2 border border-white/06"
              title="Attach files (PDF, DOCX, TXT, MD)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Notes & Files button - HIDDEN per user request
            <button
              onClick={() => setShowAssetsPanel(!showAssetsPanel)}
              disabled={isLoading}
              className="px-4 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="Notes & Files"
            >
              <FileText className="w-5 h-5" />
            </button>
            */}

            {/* Voice Dictation */}
            <VoiceDictation
              onTranscriptUpdate={handleTranscriptUpdate}
              disabled={isLoading || uploading}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => !isViewOnly && setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isViewOnly ? 'View-only mode — request edit access to send messages' : "What's on your mind?"}
              className={`flex-1 resize-none rounded-xl px-4 sm:px-5 py-3.5 sm:py-4 min-h-[44px] sm:min-h-[56px] max-h-[200px] text-base leading-relaxed ${
                isViewOnly
                  ? 'border border-blue-800/50 bg-blue-900/10 cursor-not-allowed text-gray-500'
                  : 'chat-textarea'
              }`}
              rows={1}
              disabled={isLoading || isViewOnly}
            />

            {/* Stop Button - Only visible when streaming */}
            {(isLoading || isStreamingResponse) && (
              <button
                onClick={handleStopGeneration}
                className="min-w-[44px] px-3 sm:px-6 py-3 sm:py-4 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 border border-red-500/30"
                title="Stop generating"
              >
                <Square className="w-5 h-5" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            )}

            {/* Memory controls badge */}
            <MemoryBadge />

            {/* Send button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={isViewOnly || (!input.trim() && attachedFiles.length === 0) || isLoading || uploading}
              className="send-btn min-w-[44px] px-4 sm:px-7 py-3 sm:py-4 rounded-xl flex items-center gap-2"
              title={isViewOnly ? 'View-only mode — request edit access to send messages' : undefined}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline text-sm">Uploading...</span>
                </>
              ) : isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Assets Panel */}
      <AssetsPanel
        conversationId={currentConversationId ?? undefined}
        agentId={agentId}
        isOpen={showAssetsPanel}
        onClose={() => setShowAssetsPanel(false)}
      />

      {/* Message Edit Modal - HIDDEN FOR DEMO */}
      {/* <MessageEditModal
        isOpen={!!editingMessage}
        onClose={() => setEditingMessage(null)}
        originalContent={editingMessage?.content || ''}
        onSave={handleEditMessage}
      /> */}

      {/* Voice Chat Modal - Using Gemini Live for real-time voice */}
      {showVoiceChat && user && (
        <VoiceChatLive
          agentId={agentId}
          agentName={agentData?.name || (agentId === 'voice-expert' ? 'Voice Expert' : 'Sales Roleplay Coach')}
          accentColor={agentDataFromAPI?.accent_color || '#10B981'}
          onClose={() => setShowVoiceChat(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
