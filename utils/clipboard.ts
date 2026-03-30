/**
 * Clipboard utility functions for MindsetOS
 * Handles copying deliverables and content to clipboard
 */

export type CopyFormat = 'text' | 'json' | 'markdown';

/**
 * Copy text to clipboard with format conversion
 */
export async function copyToClipboard(
  content: string | object,
  format: CopyFormat = 'text'
): Promise<boolean> {
  try {
    let textToCopy: string;

    // Convert content based on format
    switch (format) {
      case 'json':
        textToCopy = typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2);
        break;

      case 'markdown':
        textToCopy = typeof content === 'string'
          ? content
          : convertToMarkdown(content);
        break;

      case 'text':
      default:
        textToCopy = typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2);
        break;
    }

    // Use modern Clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    }

    // Fallback for older browsers
    return fallbackCopyToClipboard(textToCopy);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Fallback clipboard copy for older browsers
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    document.body.removeChild(textArea);
    return false;
  }
}

/**
 * Convert object to Markdown format
 */
function convertToMarkdown(obj: any, depth: number = 0): string {
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }

  const indent = '  '.repeat(depth);
  let markdown = '';

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (typeof item === 'object') {
        markdown += `${indent}- ${convertToMarkdown(item, depth + 1)}\n`;
      } else {
        markdown += `${indent}- ${item}\n`;
      }
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const formattedKey = key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      if (typeof value === 'object' && value !== null) {
        markdown += `${indent}**${formattedKey}**:\n`;
        markdown += convertToMarkdown(value, depth + 1);
      } else {
        markdown += `${indent}**${formattedKey}**: ${value}\n`;
      }
    }
  }

  return markdown;
}

/**
 * Copy deliverable with metadata
 */
export async function copyDeliverable(
  deliverable: {
    title: string;
    content: any;
    agentId: string;
    timestamp: Date;
  },
  format: CopyFormat = 'json'
): Promise<boolean> {
  const metadata = {
    title: deliverable.title,
    agent: deliverable.agentId,
    timestamp: deliverable.timestamp.toISOString(),
  };

  let contentToCopy: string;

  switch (format) {
    case 'json':
      contentToCopy = JSON.stringify(
        {
          ...metadata,
          content: deliverable.content,
        },
        null,
        2
      );
      break;

    case 'markdown':
      contentToCopy = `# ${deliverable.title}\n\n`;
      contentToCopy += `**Agent**: ${deliverable.agentId}\n`;
      contentToCopy += `**Generated**: ${deliverable.timestamp.toLocaleString()}\n\n`;
      contentToCopy += `---\n\n`;
      contentToCopy += convertToMarkdown(deliverable.content);
      break;

    case 'text':
    default:
      contentToCopy = `${deliverable.title}\n\n`;
      contentToCopy += convertToMarkdown(deliverable.content);
      break;
  }

  return copyToClipboard(contentToCopy, 'text');
}

/**
 * Extract deliverable from message content
 */
export function extractDeliverableFromMessage(content: string): any | null {
  // Look for JSON code blocks
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch (error) {
      console.error('Failed to parse JSON from message:', error);
    }
  }

  // Look for plain JSON objects
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      // Not valid JSON
    }
  }

  return null;
}

/**
 * Format content for display
 */
export function formatContentPreview(content: any, maxLength: number = 100): string {
  let text: string;

  if (typeof content === 'string') {
    text = content;
  } else {
    text = JSON.stringify(content, null, 2);
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}
