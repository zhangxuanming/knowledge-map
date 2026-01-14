import React, { useState, useCallback } from 'react';
import GraphVisualization from './components/GraphVisualization';
import SidePanel from './components/SidePanel';
import { generateRelatedNodes, generateExplanation } from './services/geminiService';
import { GraphData, GraphNode, GraphEdge, SearchMode, GeneratedItem } from './types';

// Helper to get hex color from type
const getColorForType = (type: string) => {
  switch (type) {
    case 'positive': return '#22c55e'; // green-500
    case 'negative': return '#ef4444'; // red-500
    case 'competitor': return '#f97316'; // orange-500
    case 'hierarchical': return '#3b82f6'; // blue-500
    default: return '#94a3b8'; // slate-400
  }
};

// 2D Flat Palette - Bold and Vibrant
const NODE_COLORS = [
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#f43f5e', // rose-500
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#84cc16', // lime-500
  '#d946ef', // fuchsia-500
];

const getRandomColor = () => NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)];

const App: React.FC = () => {
  const [data, setData] = useState<GraphData>({ nodes: [], edges: [] });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('default');

  const addToGraph = useCallback((sourceNode: GraphNode, newItems: GeneratedItem[]) => {
    setData(prevData => {
      const nextNodes = [...prevData.nodes];
      const nextEdges = [...prevData.edges];
      const nodeMap = new Map(nextNodes.map(n => [n.label.toLowerCase(), n]));

      newItems.forEach(item => {
        const itemLabel = item.label;
        const itemKey = itemLabel.toLowerCase();
        let targetNodeId: string;

        if (nodeMap.has(itemKey)) {
          // If node exists, update its explanation if missing
          const existingNode = nodeMap.get(itemKey)!;
          if (!existingNode.explanation && item.explanation) {
             existingNode.explanation = item.explanation;
          }
          targetNodeId = existingNode.id;
        } else {
          const newNode: GraphNode = {
            id: `n-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: itemLabel,
            x: sourceNode.x ? sourceNode.x + (Math.random() - 0.5) * 60 : undefined,
            y: sourceNode.y ? sourceNode.y + (Math.random() - 0.5) * 60 : undefined,
            color: getRandomColor(),
            explanation: item.explanation, // Store pre-fetched explanation
          };
          nextNodes.push(newNode);
          nodeMap.set(itemKey, newNode);
          targetNodeId = newNode.id;
        }

        const edgeExists = nextEdges.some(e => 
          (e.source === sourceNode.id && e.target === targetNodeId) || 
          (e.source === targetNodeId && e.target === sourceNode.id) ||
          ((e.source as GraphNode).id === sourceNode.id && (e.target as GraphNode).id === targetNodeId)
        );

        if (!edgeExists && sourceNode.id !== targetNodeId) {
          nextEdges.push({
            source: sourceNode.id,
            target: targetNodeId,
            relation: item.relation,
            color: getColorForType(item.relationType)
          });
        }
      });

      return { nodes: nextNodes, edges: nextEdges };
    });
  }, []);

  const handleSearch = useCallback(async (term: string) => {
    setIsLoadingGraph(true);
    // Create Root Node
    const rootNode: GraphNode = {
      id: `root-${Date.now()}`,
      label: term,
      color: getRandomColor(),
    };

    setData({ nodes: [rootNode], edges: [] });
    setActiveNodeId(rootNode.id);
    setLoadingNodeId(rootNode.id);
    setExplanation(null);

    // Parallel execution: Get children AND get root node explanation separately
    const childrenPromise = generateRelatedNodes(term, searchMode);
    const rootExplanationPromise = generateExplanation(term);

    try {
      const [items, rootExp] = await Promise.all([childrenPromise, rootExplanationPromise]);
      
      // Update root node with its explanation
      setData(prev => {
        const nodes = prev.nodes.map(n => n.id === rootNode.id ? { ...n, explanation: rootExp } : n);
        return { ...prev, nodes };
      });
      
      // Update local rootNode reference for addToGraph
      rootNode.explanation = rootExp;
      
      addToGraph(rootNode, items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGraph(false);
      setLoadingNodeId(null);
    }
  }, [addToGraph, searchMode]);

  // Click -> Show Explanation
  const handleNodeClick = useCallback(async (node: GraphNode) => {
    setActiveNodeId(node.id);
    setIsLoadingExplanation(true);
    setExplanation(null);
    
    // Check if we already have the explanation cached
    if (node.explanation) {
      setExplanation(node.explanation);
      setIsLoadingExplanation(false);
      return;
    }

    try {
      const text = await generateExplanation(node.label);
      // Cache it
      node.explanation = text; 
      setExplanation(text);
    } catch (e) {
      console.error(e);
      setExplanation("Failed to load explanation.");
    } finally {
      setIsLoadingExplanation(false);
    }
  }, []);

  // Long Press (1s) -> Generate Children
  const handleNodeLongPress = useCallback(async (node: GraphNode) => {
    setActiveNodeId(node.id);
    setLoadingNodeId(node.id);
    setIsLoadingGraph(true);
    try {
      const items = await generateRelatedNodes(node.label, searchMode);
      addToGraph(node, items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingGraph(false);
      setLoadingNodeId(null);
    }
  }, [addToGraph, searchMode]);

  return (
    <div className="w-screen h-screen bg-slate-900 text-white relative font-sans">
      <GraphVisualization 
        data={data} 
        onNodeClick={handleNodeClick}
        onNodeLongPress={handleNodeLongPress}
        activeNodeId={activeNodeId}
        loadingNodeId={loadingNodeId}
      />
      <SidePanel 
        onSearch={handleSearch} 
        searchMode={searchMode}
        onModeChange={setSearchMode}
        explanation={explanation}
        isLoadingExplanation={isLoadingExplanation}
        isLoadingGraph={isLoadingGraph}
      />
      
      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold mb-4 tracking-tight">Gemini Knowledge Graph</h1>
            <p className="text-xl text-slate-400">Enter a concept to begin exploring relationships</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
