/**
 * export-utils.ts
 * Conversation export utilities for MindsetOS.
 * Supports Markdown and PDF (via html2pdf.js).
 */

import type { Conversation } from './store';
import { buildMessageChain } from '../types/conversation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sanitize a string for use as a filename (strips path separators and control characters). */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) // cap length
    || 'conversation';
}

/**
 * Derive a human-readable title for a conversation.
 * Uses `conversation.title` if present; otherwise falls back to the first user
 * message (truncated) or a generic label.
 */
function deriveTitle(conversation: Conversation): string {
  if (conversation.title && conversation.title.trim()) {
    return conversation.title.trim();
  }

  // Walk the history to find the first user message
  const messages = conversation.history?.messages ?? {};
  for (const msg of Object.values(messages)) {
    if (msg.role === 'user' && msg.content.trim()) {
      const snippet = msg.content.trim().slice(0, 60);
      return snippet.length < msg.content.trim().length ? `${snippet}…` : snippet;
    }
  }

  return 'Conversation';
}

/** Convert a Date-like value to an ISO date string (YYYY-MM-DD). */
function toDateString(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Lightweight markdown-to-html conversion for PDF rendering (subset). */
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialize the active message chain in a conversation to clean Markdown.
 *
 * Format:
 *   # [Title] — [Agent Name]
 *   *Exported: YYYY-MM-DD*
 *
 *   **You:** …  *[HH:MM]*
 *
 *   **[Agent Name]:** …  *[HH:MM]*
 */
export function conversationToMarkdown(
  conversation: Conversation,
  agentName: string,
): string {
  const title = deriveTitle(conversation);
  const exportDate = toDateString(conversation.updatedAt ?? conversation.createdAt);

  const lines: string[] = [
    `# ${title} — ${agentName}`,
    '',
    `*Exported: ${exportDate}*`,
    '',
    '---',
    '',
  ];

  const chain = buildMessageChain(conversation.history);

  // Skip system messages — they're internal scaffolding
  const visible = chain.filter((m) => m.role !== 'system');

  for (const msg of visible) {
    const ts = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    if (msg.role === 'user') {
      lines.push(`**You:** ${msg.content}  *${ts}*`);
    } else {
      lines.push(`**${agentName}:** ${msg.content}  *${ts}*`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Trigger a browser download of a string or Blob.
 *
 * @param content  The file content
 * @param filename Target filename (will be sanitized)
 * @param mimeType MIME type string, e.g. `"text/markdown"` or `"application/pdf"`
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string,
): void {
  const safeFilename = sanitizeFilename(filename);
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after a short delay so the download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Export a conversation as a downloadable Markdown (.md) file.
 */
export function exportAsMarkdown(
  conversation: Conversation,
  agentName: string,
): void {
  const md = conversationToMarkdown(conversation, agentName);
  const title = sanitizeFilename(deriveTitle(conversation));
  const filename = `${title} — ${agentName}.md`;
  downloadFile(md, filename, 'text/markdown; charset=utf-8');
}

/**
 * Export a conversation as a PDF using html2pdf.js.
 *
 * Falls back to a Markdown download if html2pdf.js fails or is unavailable.
 */
export async function exportAsPDF(
  conversation: Conversation,
  agentName: string,
): Promise<void> {
  const md = conversationToMarkdown(conversation, agentName);
  const title = sanitizeFilename(deriveTitle(conversation));
  const pdfFilename = `${title} — ${agentName}.pdf`;

  const el = document.createElement('div');
  el.style.cssText =
    'font-family:system-ui,sans-serif;max-width:720px;padding:32px;line-height:1.7;color:#1a1a2e';

  const htmlContent = markdownToHtml(md);
  el.innerHTML = `<p>${htmlContent}</p>`;
  document.body.appendChild(el);

  try {
    // Dynamic import matches the pattern used in CanvasPanel.tsx
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const html2pdfModule = (await import('html2pdf.js')) as any;
    const html2pdfFn: (element?: HTMLElement) => {
      from: (el: HTMLElement) => {
        set: (opts: Record<string, unknown>) => { save: () => Promise<void> };
      };
    } = html2pdfModule.default ?? html2pdfModule;

    await html2pdfFn()
      .from(el)
      .set({
        filename: pdfFilename,
        margin: 12,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        html2canvas: { scale: 2, useCORS: true },
      })
      .save();
  } catch (err) {
    console.warn('[export-utils] PDF export failed, falling back to Markdown:', err);
    // Fallback: deliver as Markdown
    const mdFilename = `${title} — ${agentName}.md`;
    downloadFile(md, mdFilename, 'text/markdown; charset=utf-8');
  } finally {
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
  }
}
