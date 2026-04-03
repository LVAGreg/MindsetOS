'use client';

import { useState } from 'react';
import { MoreVertical, Star, FolderInput, Edit, Archive, Trash2, Loader2, Download, Pin, PinOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Conversation } from '@/lib/store';
import { exportAsMarkdown } from '@/lib/export-utils';

interface ConversationMenuProps {
  conversationId: string;
  isStarred: boolean;
  onRename: () => void;
  onMoveToProject: () => void;
  /** Full conversation object — required for Export action. When absent, Export renders as disabled. */
  conversation?: Conversation;
  /** Agent display name for export filename and header. */
  agentName?: string;
  /** Whether this conversation is pinned. When undefined/absent, Pin option is not rendered. */
  isPinned?: boolean;
  /** Called when user pins the conversation. Required together with onUnpin to show Pin option. */
  onPin?: (id: string) => void;
  /** Called when user unpins the conversation. Required together with onPin to show Pin option. */
  onUnpin?: (id: string) => void;
}

// Design tokens
const T = {
  card:    'rgba(18,18,31,0.95)',
  border:  '#1e1e30',
  text:    '#ededf5',
  muted:   '#9090a8',
  dim:     '#5a5a72',
  amber:   '#fcc824',
  red:     '#f87171',
  redHover:'rgba(248,113,113,0.1)',
  hover:   'rgba(255,255,255,0.05)',
  rowBase: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    width: '100%',
    padding: '8px 16px',
    textAlign: 'left' as const,
    fontSize: '14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
};

export default function ConversationMenu({
  conversationId,
  isStarred,
  onRename,
  onMoveToProject,
  conversation,
  agentName = 'Agent',
  isPinned,
  onPin,
  onUnpin,
}: ConversationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState<'star' | 'archive' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pin option is only shown when both callbacks are provided
  const showPinOption = typeof onPin === 'function' && typeof onUnpin === 'function';

  const { toggleStarConversation, archiveConversation, deleteConversation } = useAppStore();

  const clearError = () => setError(null);

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setError(null);
    setBusy('star');
    try {
      await toggleStarConversation(conversationId);
      setIsOpen(false);
    } catch {
      setError('Could not update star — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setError(null);
    setBusy('archive');
    try {
      await archiveConversation(conversationId);
      setIsOpen(false);
    } catch {
      setError('Could not archive — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) return;
    setError(null);
    setBusy('delete');
    try {
      await deleteConversation(conversationId);
      setIsOpen(false);
    } catch {
      setError('Could not delete — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!conversation) return; // disabled state — button is aria-disabled, but guard anyway
    try {
      exportAsMarkdown(conversation, agentName);
      setIsOpen(false);
    } catch (err) {
      console.error('[ConversationMenu] Export failed:', err);
      setError('Could not export — please try again.');
    }
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showPinOption) return;
    try {
      if (isPinned) {
        onUnpin!(conversationId);
      } else {
        onPin!(conversationId);
      }
      setIsOpen(false);
    } catch (err) {
      console.error('[ConversationMenu] Pin/unpin failed:', err);
      setError('Could not update pin — please try again.');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setIsOpen(!isOpen);
        }}
        aria-label="Conversation options"
        style={{
          padding: '4px',
          background: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
          color: T.muted,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.hover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <MoreVertical style={{ width: '16px', height: '16px' }} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
            onClick={() => { setIsOpen(false); setError(null); }}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              width: '192px',
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 20,
              overflow: 'hidden',
            }}
          >
            {/* Error banner */}
            {error && (
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: T.red,
                  background: 'rgba(248,113,113,0.08)',
                  borderBottom: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>{error}</span>
                <button
                  onClick={clearError}
                  aria-label="Dismiss error"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.red, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            )}

            <div style={{ padding: '4px 0' }}>
              {/* Star / Unstar */}
              <button
                onClick={handleToggleStar}
                disabled={!!busy}
                style={{
                  ...T.rowBase,
                  color: T.text,
                  opacity: busy && busy !== 'star' ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {busy === 'star' ? (
                  <Loader2 style={{ width: '16px', height: '16px', color: T.amber, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Star
                    style={{
                      width: '16px',
                      height: '16px',
                      color: T.amber,
                      fill: isStarred ? T.amber : 'none',
                    }}
                  />
                )}
                <span>{isStarred ? 'Unstar' : 'Star'} conversation</span>
              </button>

              {/* Move to Project */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onMoveToProject();
                }}
                disabled={!!busy}
                style={{
                  ...T.rowBase,
                  color: T.text,
                  opacity: busy ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <FolderInput style={{ width: '16px', height: '16px', color: T.muted }} />
                <span>Move to project</span>
              </button>

              {/* Rename */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onRename();
                }}
                disabled={!!busy}
                style={{
                  ...T.rowBase,
                  color: T.text,
                  opacity: busy ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Edit style={{ width: '16px', height: '16px', color: T.muted }} />
                <span>Rename</span>
              </button>

              {/* Export as Markdown */}
              <button
                onClick={handleExport}
                disabled={!!busy || !conversation}
                aria-label={conversation ? 'Export conversation as Markdown' : 'Open conversation to export'}
                title={conversation ? undefined : 'Open conversation to export'}
                style={{
                  ...T.rowBase,
                  color: conversation ? T.text : T.dim,
                  opacity: (busy || !conversation) ? 0.5 : 1,
                  cursor: conversation ? 'pointer' : 'not-allowed',
                }}
                onMouseEnter={(e) => { if (!busy && conversation) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Download style={{ width: '16px', height: '16px', color: conversation ? T.muted : T.dim }} />
                <span>Export as Markdown</span>
              </button>

              {/* Pin / Unpin */}
              {showPinOption && (
                <button
                  onClick={handlePin}
                  disabled={!!busy}
                  aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
                  style={{
                    ...T.rowBase,
                    color: T.text,
                    opacity: busy ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {isPinned ? (
                    <PinOff style={{ width: '16px', height: '16px', color: T.muted }} />
                  ) : (
                    <Pin style={{ width: '16px', height: '16px', color: T.muted }} />
                  )}
                  <span>{isPinned ? 'Unpin conversation' : 'Pin conversation'}</span>
                </button>
              )}

              {/* Archive */}
              <button
                onClick={handleArchive}
                disabled={!!busy}
                style={{
                  ...T.rowBase,
                  color: T.text,
                  opacity: busy && busy !== 'archive' ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {busy === 'archive' ? (
                  <Loader2 style={{ width: '16px', height: '16px', color: T.muted, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Archive style={{ width: '16px', height: '16px', color: T.muted }} />
                )}
                <span>Archive</span>
              </button>

              {/* Delete */}
              <button
                onClick={handleDelete}
                disabled={!!busy}
                style={{
                  ...T.rowBase,
                  color: T.red,
                  borderTop: `1px solid ${T.border}`,
                  opacity: busy && busy !== 'delete' ? 0.5 : 1,
                }}
                onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLElement).style.background = T.redHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {busy === 'delete' ? (
                  <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
