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
};

/**
 * Agent Icon Mapping by Agent ID (Fallback for compatibility)
 * Maps agent IDs to Lucide icon components
 */
export const AGENT_ICONS: Record<string, LucideIcon> = {
  // Core agents
  'general': GraduationCap,
  'client-onboarding': HandshakeIcon,
  'money-model-maker': DollarSign,
  'mmm-5in30': Gem,
  'fast-fix-finder': Zap,
  'offer-promo-printer': Megaphone,
  'promo-planner': Calendar,
  'qualification-call-builder': Phone,
  'linkedin-events-builder': Target,
  'linkedin-events-builder-v2': Target,
  'linkedin-events-builder-v3': Sparkles,
  'linkedin-events-builder-v6': Palette,
  'brand-voice-analyzer': PenLine,

  // V2+ variants - Each has unique icon representing their evolution
  'money-model-makerv2': TrendingUp,      // Growth/scaling focus
  'money-model-makerv3': Crosshair,       // Precision targeting
  'money-model-makerv4': Rocket,          // Launch/momentum
  'money-model-makerv5': Sparkles,        // Enhanced/magical experience

  // Special agents
  'value-quantifier-v6': Calculator,
  'memory-insights-v6': Brain,
  'deep-research-expert': Search,
  'content-catalyst': PenLine,

  // Voice agents
  'voice-expert': Mic,
  'sales-roleplay-coach': Headphones,

  // Agency tools
  'agent-creator': Wand2,
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
