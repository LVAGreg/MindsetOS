import {
  GraduationCap,
  HandshakeIcon,
  DollarSign,
  Gem,
  Zap,
  Megaphone,
  Calendar,
  Phone,
  Target,
  Sparkles,
  Palette,
  Calculator,
  Brain,
  PenLine,
  TrendingUp,
  Crosshair,
  Rocket,
  Search,
  Mic,
  Headphones,
  Wand2,
  Lightbulb,
  BookOpen,
  Users,
  Shield,
  Heart,
  Briefcase,
  Code,
  MessageSquare,
  FileText,
  Flame,
  Sun,
  BarChart2,
  Scale,
  Handshake,
  Focus,
  Activity,
  Pen,
  Bug,
  LucideIcon
} from 'lucide-react';

/**
 * Lucide Icon Name Mapping (Database-driven)
 * Maps icon names from database to Lucide icon components
 */
export const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  GraduationCap,
  HandshakeIcon,
  DollarSign,
  Gem,
  Zap,
  Megaphone,
  Calendar,
  Phone,
  Target,
  Sparkles,
  Palette,
  Calculator,
  Brain,
  PenLine,
  TrendingUp,
  Crosshair,
  Rocket,
  Search,
  Mic,
  Headphones,
  Wand2,
  Lightbulb,
  BookOpen,
  Users,
  Shield,
  Heart,
  Briefcase,
  Code,
  MessageSquare,
  FileText,
  Flame,
  Sun,
  BarChart2,
  Scale,
  Handshake,
  Focus,
  Activity,
  Pen,
  Bug,
};

/**
 * Agent Icon Mapping by Agent ID (Fallback for compatibility)
 * Maps agent IDs to Lucide icon components
 */
export const AGENT_ICONS: Record<string, LucideIcon> = {
  // Core MindsetOS agents
  'general': GraduationCap,
  'mindset-super-agent': Brain,
  'client-onboarding': HandshakeIcon,
  'mindset-score': Target,
  'reset-guide': Rocket,
  'architecture-coach': Lightbulb,
  'inner-world-mapper': BookOpen,
  'practice-builder': Calendar,
  'decision-framework': Crosshair,
  'accountability-partner': Users,
  'story-excavator': Search,
  'conversation-curator': MessageSquare,
  'launch-companion': Sparkles,

  // Voice agents
  'voice-expert': Mic,
  'sales-roleplay-coach': Headphones,

  // Agency tools
  'agent-creator': Wand2,

  // New agents (migration 065)
  'goal-architect': Target,
  'belief-debugger': Brain,
  'morning-ritual-builder': Sun,
  'energy-optimizer': Zap,
  'fear-processor': Flame,
  'relationship-architect': Handshake,
  'focus-trainer': Focus,
  'values-clarifier': Scale,
  'transformation-tracker': BarChart2,
  'content-architect': Pen,

  // Sales agents (063)
  'pipeline-coach': TrendingUp,
  'outreach-coach': MessageSquare,
};

/**
 * Get icon component for agent
 * Supports both icon names from database and agent IDs for fallback
 * Returns the Lucide icon component or a default icon
 */
export function getAgentIcon(agentIdOrIconName: string): LucideIcon {
  // First try to match as Lucide icon name (database-driven)
  if (LUCIDE_ICON_MAP[agentIdOrIconName]) {
    return LUCIDE_ICON_MAP[agentIdOrIconName];
  }

  // Fallback to agent ID mapping (compatibility)
  const normalizedId = agentIdOrIconName?.toLowerCase();
  return AGENT_ICONS[normalizedId] || GraduationCap;
}

/**
 * AgentIcon Component
 * Renders the appropriate Lucide icon for an agent
 */
interface AgentIconProps {
  agentId: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function AgentIcon({ agentId, className = 'w-6 h-6', size, style }: AgentIconProps) {
  const IconComponent = getAgentIcon(agentId);

  return <IconComponent className={className} size={size} style={style} />;
}
