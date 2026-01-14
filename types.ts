export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  group?: number;
  radius?: number;
  color?: string; // Node specific color
  explanation?: string; // Pre-fetched explanation
}

export interface GraphEdge {
  source: string | GraphNode; // D3 converts string ID to object ref
  target: string | GraphNode;
  relation: string;
  color?: string; // Optional hex color for relationship type
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GeneratedItem {
  label: string;
  relation: string;
  relationType: 'positive' | 'negative' | 'neutral' | 'competitor' | 'hierarchical';
  explanation: string;
}

export type SearchMode = 'default' | 'precise';

export interface ExplanationResponse {
  explanation: string;
}
