import type { AgentNode } from "./types";

// Positions are in normalized 3D space (-1 to 1), roughly forming a brain silhouette:
//   Y-axis: top (+) → bottom (-)
//   X-axis: left (-) → right (+)
//   Z-axis: front (+) → rear (-)
//
// Hemisphere mapping:
//   Left hemisphere  (x < 0): self-awareness (temporal)
//   Right hemisphere (x > 0): coaching (frontal-right), accountability
//   Center:          assessment (crown), strategy (center-front), content (bottom)
//   Back:            admin (back-top)

export const AGENT_NODES: AgentNode[] = [
  // ─── ASSESSMENT — crown ───────────────────────────────────────────────────
  {
    slug: "mindset-score",
    name: "Mindset Score Agent",
    shortName: "Score",
    description:
      "Free entry-point assessment. 5 questions that reveal where your mindset is working for you — and where it's not.",
    color: "#F59E0B",
    category: "assessment",
    position: [0, 0.7, 0],
    connections: ["reset-guide", "architecture-coach", "inner-world-mapper", "decision-framework"],
    weight: 3,
  },

  // ─── COACHING — right hemisphere ─────────────────────────────────────────
  {
    slug: "reset-guide",
    name: "Reset Guide",
    shortName: "Reset",
    description:
      "The 48-Hour Mindset Reset. Six targeted exercises that interrupt your current pattern and install a new default.",
    color: "#06B6D4",
    category: "coaching",
    position: [0.55, 0.3, 0.3],
    connections: ["mindset-score", "practice-builder"],
    weight: 2,
  },
  {
    slug: "architecture-coach",
    name: "Architecture Coach",
    shortName: "Architect",
    description:
      "90-Day Mindset Architecture. Your premium guide for rebuilding the operating system underneath your decisions.",
    color: "#8B5CF6",
    category: "coaching",
    position: [0.6, 0.1, 0],
    connections: ["mindset-score", "practice-builder", "accountability-partner", "launch-companion"],
    weight: 3,
  },
  {
    slug: "practice-builder",
    name: "Practice Builder",
    shortName: "Practice",
    description:
      "Designs your daily mindset routines — the reps that make the architecture stick over time.",
    color: "#10B981",
    category: "performance",
    position: [0.5, -0.2, -0.3],
    connections: ["reset-guide", "architecture-coach", "accountability-partner"],
    weight: 2,
  },

  // ─── SELF-AWARENESS — left hemisphere ────────────────────────────────────
  {
    slug: "inner-world-mapper",
    name: "Inner World Mapper",
    shortName: "Inner World",
    description:
      "Maps the beliefs and stories driving your decisions — makes the invisible visible.",
    color: "#EC4899",
    category: "self-awareness",
    position: [-0.6, 0.1, -0.2],
    connections: ["mindset-score", "story-excavator"],
    weight: 2,
  },
  {
    slug: "story-excavator",
    name: "Story Excavator",
    shortName: "Stories",
    description:
      "Digs into the core narratives you've been running — finds the ones holding you back.",
    color: "#F97316",
    category: "mindset",
    position: [-0.55, -0.1, 0.1],
    connections: ["inner-world-mapper"],
    weight: 2,
  },

  // ─── STRATEGY — front center ──────────────────────────────────────────────
  {
    slug: "decision-framework",
    name: "Decision Framework",
    shortName: "DESIGN",
    description:
      "Walks you through the DESIGN process: Define → Examine → Separate → Identify → Generate → Name.",
    color: "#3B82F6",
    category: "strategy",
    position: [0.1, 0.2, 0.55],
    connections: ["mindset-score", "architecture-coach"],
    weight: 2,
  },

  // ─── ACCOUNTABILITY — right bottom ───────────────────────────────────────
  {
    slug: "accountability-partner",
    name: "Accountability Partner",
    shortName: "Accountability",
    description:
      "Daily check-ins that keep you anchored to the architecture you built — no guilt, just data.",
    color: "#059669",
    category: "accountability",
    position: [0.55, -0.4, 0.1],
    connections: ["architecture-coach", "practice-builder"],
    weight: 2,
  },

  // ─── CONTENT — bottom center ─────────────────────────────────────────────
  {
    slug: "conversation-curator",
    name: "Conversation Curator",
    shortName: "Podcasts",
    description:
      "Matches you with podcast conversations that hit the exact mindset territory you're working through right now.",
    color: "#14B8A6",
    category: "content",
    position: [0, -0.6, 0],
    connections: ["mindset-score"],
    weight: 1,
  },

  // ─── ADMIN — back top ─────────────────────────────────────────────────────
  {
    slug: "launch-companion",
    name: "Launch Companion",
    shortName: "Launch",
    description:
      "Greg's personal assistant for the Architecture Intensive — handles logistics, scheduling, and cohort coordination.",
    color: "#6B7280",
    category: "admin",
    position: [-0.2, 0.5, -0.4],
    connections: ["architecture-coach"],
    weight: 1,
  },
];

export const AGENT_MAP: Record<string, AgentNode> = Object.fromEntries(
  AGENT_NODES.map((node) => [node.slug, node])
);
