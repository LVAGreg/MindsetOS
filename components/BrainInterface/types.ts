export interface AgentNode {
  slug: string;
  name: string;
  shortName: string;       // 1-3 word version for labels
  description: string;
  color: string;           // hex accent color
  category: string;
  // 3D position in normalized space (-1 to 1)
  position: [number, number, number];
  // Which other agent slugs this one connects to
  connections: string[];
  // Visual weight (1-3, affects node size)
  weight: number;
}

export interface BrainVariantProps {
  onAgentSelect: (slug: string) => void;
  activeSlug?: string;
}
