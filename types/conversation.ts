/**
 * Tree-based conversation structure (inspired by Open WebUI)
 * Enables natural branching and editing without message duplication
 */

export interface MessageNode {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // Tree structure
  parentId: string | null;
  childrenIds: string[];

  // Branch metadata
  branchIndex: number;
  siblingCount: number;

  // Edit tracking
  isEdited: boolean;
  editedAt: Date | null;

  // Timestamps
  timestamp: Date;

  // Agent context
  agentId?: string;

  // Optional metadata
  files?: any[];
  metadata?: Record<string, any>;
  widget?: any; // Interactive widgets (for forms, options, etc.)
}

export interface ConversationHistory {
  // Current active message (leaf of active branch)
  currentId: string | null;

  // All messages in tree structure
  messages: {
    [id: string]: MessageNode;
  };
}

export interface Conversation {
  id: string;
  agentId: string;
  title: string;

  // Tree-based history
  history: ConversationHistory;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  isStarred: boolean;
  projectId?: string;
  modelOverride?: string;
}

/**
 * Helper to build message chain from currentId to root
 */
export function buildMessageChain(history: ConversationHistory): MessageNode[] {
  if (!history.currentId) return [];

  const chain: MessageNode[] = [];
  let currentMsg = history.messages[history.currentId];

  // Walk up the tree from current message to root
  while (currentMsg) {
    chain.unshift({ ...currentMsg }); // Add to beginning
    currentMsg = currentMsg.parentId ? history.messages[currentMsg.parentId] : null;
  }

  return chain;
}

/**
 * Helper to find leaf message in a branch (deepest child)
 */
export function findBranchLeaf(history: ConversationHistory, messageId: string): string {
  let current = history.messages[messageId];
  if (!current) return messageId;

  // Drill down to deepest child (last child at each level)
  while (current.childrenIds && current.childrenIds.length > 0) {
    const lastChildId = current.childrenIds[current.childrenIds.length - 1];
    current = history.messages[lastChildId];
  }

  return current.id;
}
