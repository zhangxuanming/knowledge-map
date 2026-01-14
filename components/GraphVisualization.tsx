import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode, GraphEdge } from '../types';

interface GraphVisualizationProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  onNodeLongPress: (node: GraphNode) => void;
  activeNodeId: string | null;
  loadingNodeId: string | null;
}

const NODE_RADIUS = 36; // Larger 2D nodes

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  data,
  onNodeClick,
  onNodeLongPress,
  activeNodeId,
  loadingNodeId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // Initialize graph once
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    svg.selectAll("*").remove();

    // Definitions
    const defs = svg.append("defs");
    
    // Simple Drop Shadow for 2D depth
    const filter = defs.append("filter")
      .attr("id", "dropShadow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
      
    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 2)
      .attr("result", "blur");
      
    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 1)
      .attr("dy", 2)
      .attr("result", "offsetBlur");
      
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Arrow marker
    defs.selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", NODE_RADIUS + 8) // Offset based on radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#64748b") // Slate-500
      .attr("d", "M0,-5L10,0L0,5");

    // Main Group with Zoom
    const g = svg.append("g");
    g.append("g").attr("class", "links-layer");
    g.append("g").attr("class", "nodes-layer");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Initial simulation
    simulationRef.current = d3.forceSimulation<GraphNode, GraphEdge>()
      .force("link", d3.forceLink<GraphNode, GraphEdge>().id(d => d.id).distance(160))
      .force("charge", d3.forceManyBody().strength(-500)) // Stronger repulsion for larger nodes
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(NODE_RADIUS + 10));

    return () => {
      simulationRef.current?.stop();
    };
  }, []);

  // Update Data
  useEffect(() => {
    if (!simulationRef.current || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const gLinks = svg.select(".links-layer");
    const gNodes = svg.select(".nodes-layer");
    const simulation = simulationRef.current;
    const { nodes, edges } = data;

    // --- Update Links ---
    const link = gLinks.selectAll<SVGGElement, GraphEdge>(".link-group")
      .data(edges, (d) => `${(d.source as GraphNode).id || d.source}-${(d.target as GraphNode).id || d.target}`);

    link.exit().remove();

    const linkEnter = link.enter().append("g").attr("class", "link-group");

    linkEnter.append("line")
      .attr("class", "link-line")
      .attr("stroke", d => d.color || "#64748b")
      .attr("stroke-opacity", 0.5)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow)");

    linkEnter.append("rect")
      .attr("class", "link-bg")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#0f172a"); // Match bg

    linkEnter.append("text")
      .attr("class", "link-text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#94a3b8")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .text(d => d.relation);

    const linkMerge = linkEnter.merge(link);

    // --- Update Nodes ---
    const node = gNodes.selectAll<SVGGElement, GraphNode>(".node-group")
      .data(nodes, d => d.id);

    node.exit().transition().duration(300).attr("opacity", 0).remove();

    const nodeEnter = node.enter().append("g")
      .attr("class", "node-group")
      .attr("cursor", "pointer");

    // Drag behavior & Long Press Logic
    let isDragging = false;
    let longPressTimer: NodeJS.Timeout | null = null;
    let longPressTriggered = false;

    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation?.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        
        isDragging = false;
        longPressTriggered = false;

        // Start 1s timer
        longPressTimer = setTimeout(() => {
          longPressTriggered = true;
          // Trigger the long press action (Expand)
          onNodeLongPress(d); 
        }, 1000);
      })
      .on("drag", (event, d) => {
        // Any drag movement cancels the long press
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        
        d.fx = event.x;
        d.fy = event.y;
        isDragging = true;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation?.alphaTarget(0);
        d.fx = null;
        d.fy = null;

        // Clean up timer if it hasn't fired yet
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      });

    nodeEnter.call(dragBehavior);

    // 1. Circle Body (2D Flat)
    nodeEnter.append("circle")
      .attr("class", "node-circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", d => d.color || "#38bdf8")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("filter", "url(#dropShadow)");

    // 2. Loading Spinner (White Ring)
    const arc = d3.arc()
      .innerRadius(NODE_RADIUS - 6)
      .outerRadius(NODE_RADIUS - 3)
      .startAngle(0)
      .endAngle(Math.PI * 1.5);

    nodeEnter.append("path")
      .attr("class", "loading-spinner")
      .attr("d", arc as any)
      .attr("fill", "white")
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // 3. Label
    nodeEnter.append("text")
      .attr("class", "node-label")
      .attr("dy", 4) // Center vertically
      .attr("text-anchor", "middle")
      .text(d => d.label)
      .attr("fill", "#ffffff")
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.5)")
      .each(function(d) {
        // Wrap text if too long (simple split)
        const el = d3.select(this);
        const words = d.label.split(/\s+/);
        if (words.length > 1) {
           el.text("");
           el.append("tspan").attr("x", 0).attr("dy", "-0.4em").text(words.slice(0, Math.ceil(words.length/2)).join(" "));
           el.append("tspan").attr("x", 0).attr("dy", "1.2em").text(words.slice(Math.ceil(words.length/2)).join(" "));
        }
      });

    const nodeMerge = nodeEnter.merge(node);

    // Update visuals on every render
    nodeMerge.select(".node-circle")
      .transition().duration(300)
      .attr("stroke", d => d.id === activeNodeId ? "#ffffff" : "rgba(255,255,255,0.7)")
      .attr("stroke-width", d => d.id === activeNodeId ? 4 : 2)
      // Dim inactive nodes if one is active
      .attr("opacity", d => (activeNodeId && d.id !== activeNodeId) ? 0.6 : 1);

    // Spinner Logic
    nodeMerge.select(".loading-spinner")
      .attr("opacity", d => d.id === loadingNodeId ? 0.8 : 0)
      .each(function(d) {
        const el = d3.select(this);
        if (d.id === loadingNodeId) {
            if (!el.classed("spinning")) {
                el.classed("spinning", true);
                const spin = () => {
                    el.transition()
                      .duration(1000)
                      .ease(d3.easeLinear)
                      .attrTween("transform", () => d3.interpolateString("rotate(0)", "rotate(360)"))
                      .on("end", spin);
                };
                spin();
            }
        } else {
            el.classed("spinning", false);
            el.interrupt();
            el.attr("transform", "rotate(0)");
        }
      });

    // Click Handler (Robust separation from Drag)
    nodeMerge.on("click", (event, d) => {
      // Ignore click if:
      // 1. It was a drag operation (moved)
      // 2. It was a long press (timer fired)
      if (isDragging || longPressTriggered) {
        event.stopPropagation();
        return;
      }
      
      onNodeClick(d);
    });

    // Simulation Tick
    simulation.nodes(nodes).on("tick", () => {
      linkMerge.select(".link-line")
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      linkMerge.each(function(d) {
        const source = d.source as GraphNode;
        const target = d.target as GraphNode;
        if (source.x === undefined || target.x === undefined) return;
        
        const x = (source.x + target.x) / 2;
        const y = (source.y + target.y) / 2;
        
        const el = d3.select(this);
        const text = el.select(".link-text");
        text.attr("x", x).attr("y", y);

        const bbox = (text.node() as SVGTextElement).getBBox();
        el.select(".link-bg")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4);
      });

      nodeMerge.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    simulation.force<d3.ForceLink<GraphNode, GraphEdge>>("link")?.links(edges);
    simulation.alpha(1).restart();

  }, [data, activeNodeId, loadingNodeId, onNodeClick, onNodeLongPress]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-900">
        <svg ref={svgRef} className="w-full h-full block" style={{touchAction: 'none'}} />
    </div>
  );
};

export default GraphVisualization;
