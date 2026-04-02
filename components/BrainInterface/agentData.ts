import type { AgentNode } from "./types";

// Positions are in normalized 3D space (-1 to 1), roughly forming a brain silhouette:
//   Y-axis: top (+) → bottom (-)
//   X-axis: left (-) → right (+)
//   Z-axis: front (+) → rear (-)
//
// Hemisphere mapping:
//   Left hemisphere  (x < 0): self-awareness (temporal), mindset (frontal-left)
//   Right hemisphere (x > 0): coaching (frontal-right), accountability (rear-right)
//   Center:          assessment (crown), strategy (center-front)
//   Bottom rear:     performance, content

export const AGENT_NODES: AgentNode[] = [
  // ─── ASSESSMENT — top center (crown) ─────────────────────────────────────
  {
    slug: "mindset-score",
    name: "Mindset Score Agent",
    shortName: "Score",
    description:
      "Free entry-point assessment. 5 questions that reveal where your mindset is working for you — and where it's not.",
    color: "#F59E0B",
    category: "assessment",
    position: [0, 0.7, 0],
    connections: ["reset-guide", "architecture-coach", "inner-world-mapper"],
    weight: 3,
  },

  // ─── COACHING — right frontal area ───────────────────────────────────────
  {
    slug: "reset-guide",
    name: "Reset Guide",
    shortName: "Reset",
    description:
      "The 48-Hour Mindset Reset. Six targeted exercises that interrupt your current pattern and install a new default.",
    color: "#06B6D4",
    category: "coaching",
    position: [0.5, 0.4, 0.3],
    connections: ["practice-builder"],
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
    position: [0.7, 0.2, 0.1],
    connections: ["practice-builder", "decision-framework", "accountability-partner"],
    weight: 3,
  },
  {
    slug: "practice-builder",
    name: "Practice Builder",
    shortName: "Practice",
    description:
      "Designs your daily mindset routines — the reps that make the architecture stick over time.",
    color: "#10B981",
    category: "coaching",
    position: [0.6, -0.1, 0.2],
    connections: ["accountability-partner", "energy-optimizer", "focus-trainer"],
    weight: 2,
  },

  // ─── SELF-AWARENESS — left rear (temporal) ────────────────────────────────
  {
    slug: "inner-world-mapper",
    name: "Inner World Mapper",
    shortName: "Inner World",
    description:
      "Maps the beliefs and stories driving your decisions — makes the invisible visible.",
    color: "#EC4899",
    category: "self-awareness",
    position: [-0.65, 0.3, -0.3],
    connections: ["story-excavator", "belief-debugger", "values-clarifier"],
    weight: 2,
  },
  {
    slug: "story-excavator",
    name: "Story Excavator",
    shortName: "Stories",
    description:
      "Digs into the core narratives you've been running — finds the ones holding you back.",
    color: "#F97316",
    category: "self-awareness",
    position: [-0.7, 0.0, -0.4],
    connections: ["belief-debugger", "fear-processor"],
    weight: 2,
  },

  // ─── STRATEGY — center front ──────────────────────────────────────────────
  {
    slug: "decision-framework",
    name: "Decision Framework",
    shortName: "DESIGN",
    description:
      "Walks you through the DESIGN process: Define → Examine → Separate → Identify → Generate → Name.",
    color: "#3B82F6",
    category: "strategy",
    position: [0.1, 0.1, 0.6],
    connections: ["fear-processor", "goal-architect"],
    weight: 2,
  },

  // ─── ACCOUNTABILITY — right rear ─────────────────────────────────────────
  {
    slug: "accountability-partner",
    name: "Accountability Partner",
    shortName: "Accountability",
    description:
      "Daily check-ins that keep you anchored to the architecture you built — no guilt, just data.",
    color: "#059669",
    category: "accountability",
    position: [0.65, -0.1, -0.45],
    connections: [],
    weight: 2,
  },

  // ─── MINDSET — left frontal ───────────────────────────────────────────────
  {
    slug: "belief-debugger",
    name: "Belief Debugger",
    shortName: "Beliefs",
    description:
      "Finds the specific beliefs creating friction in your results and runs them through a systematic rewrite.",
    color: "#A855F7",
    category: "mindset",
    position: [-0.55, 0.3, 0.3],
    connections: [],
    weight: 2,
  },
  {
    slug: "fear-processor",
    name: "Fear Processor",
    shortName: "Fear",
    description:
      "Turns fear from a blocker into signal — decodes what it's pointing at so you can act anyway.",
    color: "#EF4444",
    category: "mindset",
    position: [-0.45, -0.05, 0.4],
    connections: [],
    weight: 2,
  },
  {
    slug: "goal-architect",
    name: "Goal Architect",
    shortName: "Goals",
    description:
      "Builds goals that are structurally sound — anchored in values, not performance anxiety.",
    color: "#6366F1",
    category: "mindset",
    position: [-0.3, 0.15, 0.5],
    connections: ["values-clarifier"],
    weight: 2,
  },
  {
    slug: "values-clarifier",
    name: "Values Clarifier",
    shortName: "Values",
    description:
      "Cuts through the noise to identify your actual values — the ones you operate from, not just the ones you list.",
    color: "#F472B6",
    category: "mindset",
    position: [-0.55, -0.2, 0.15],
    connections: [],
    weight: 1,
  },

  // ─── PERFORMANCE — bottom rear ────────────────────────────────────────────
  {
    slug: "energy-optimizer",
    name: "Energy Optimizer",
    shortName: "Energy",
    description:
      "Audits how you spend your cognitive and physical energy — and redesigns the allocation.",
    color: "#FBBF24",
    category: "performance",
    position: [0.3, -0.55, -0.35],
    connections: ["focus-trainer"],
    weight: 1,
  },
  {
    slug: "focus-trainer",
    name: "Focus Trainer",
    shortName: "Focus",
    description:
      "Builds the deep-work muscle — structured reps that extend your attention span and kill distraction defaults.",
    color: "#84CC16",
    category: "performance",
    position: [0.0, -0.6, -0.25],
    connections: [],
    weight: 1,
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
    position: [-0.15, -0.65, -0.1],
    connections: ["mindset-score"],
    weight: 1,
  },
];

export const AGENT_MAP: Record<string, AgentNode> = Object.fromEntries(
  AGENT_NODES.map((node) => [node.slug, node])
);
