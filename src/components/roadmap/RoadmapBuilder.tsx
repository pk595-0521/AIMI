import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { RoadmapNode, TrackConfig, AttemptState } from '../../types';
import { NodeEditModal } from './NodeEditModal';
import { useRoadmapCoordinates } from '../../hooks/useRoadmapCoordinates';

interface RoadmapBuilderProps {
  trackConfig: TrackConfig;
  attemptState: AttemptState;
  onUpdateNodes: (nodes: RoadmapNode[]) => void;
  onSelectDecisionOption?: (nodeId: string, optionId: string, rationale: string, fields?: Record<string,string>) => void;
  onUpdateDeliverable?: (id: string, value: string) => void;
  isCopilotOpen?: boolean;
  onToggleCopilot?: () => void;
}

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 520;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

const STAGES = [
  { key: 'DIAGNOSE', label: '1. DIAGNOSE', subtext: 'Context & Baseline', xStart: 0, xEnd: 270 },
  { key: 'ANALYZE', label: '2. ANALYZE', subtext: 'Models & Scrutiny', xStart: 270, xEnd: 540 },
  { key: 'DECIDE', label: '3. DECIDE', subtext: 'Tradeoffs & Choice', xStart: 540, xEnd: 810 },
  { key: 'PILOT', label: '4. PILOT / REVISE', subtext: 'Validation & Contingency', xStart: 810, xEnd: 1080 },
];

export const RoadmapBuilder: React.FC<RoadmapBuilderProps> = ({
  trackConfig,
  attemptState,
  onUpdateNodes,
  onSelectDecisionOption,
  isCopilotOpen = true,
  onToggleCopilot,
}) => {
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Zoom & Scaling State
  const [zoom, setZoom] = useState<number>(1);
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true);

  const nodes = useMemo(() => {
    return attemptState.roadmapNodesState && attemptState.roadmapNodesState.length > 0
      ? attemptState.roadmapNodesState
      : trackConfig.roadmapNodes;
  }, [attemptState.roadmapNodesState, trackConfig.roadmapNodes]);

  // Dragging state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [localNodes, setLocalNodes] = useState<RoadmapNode[]>(nodes);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);

  // Auto-fit calculation based on container width
  const updateFitScale = useCallback(() => {
    if (!containerRef.current || !isFitWidth) return;
    const availableWidth = containerRef.current.clientWidth - 2; // account for borders
    if (availableWidth > 0) {
      // Calculate scale to fit CANVAS_WIDTH into availableWidth
      const fitScale = Math.min(1.0, Math.max(0.65, availableWidth / CANVAS_WIDTH));
      setZoom(Number(fitScale.toFixed(2)));
    }
  }, [isFitWidth]);

  useEffect(() => {
    updateFitScale();
    window.addEventListener('resize', updateFitScale);
    return () => window.removeEventListener('resize', updateFitScale);
  }, [updateFitScale]);

  // Also re-check fit scale when copilot state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFitScale();
    }, 200);
    return () => clearTimeout(timer);
  }, [isCopilotOpen, updateFitScale]);

  const handlePointerDown = (e: React.PointerEvent, node: RoadmapNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const currentX = node.position?.x ?? 50;
    const currentY = node.position?.y ?? 100;

    const clickX = (e.clientX - canvasRect.left) / zoom;
    const clickY = (e.clientY - canvasRect.top) / zoom;

    setDraggingId(node.id);
    setDragOffset({
      x: clickX - currentX,
      y: clickY - currentY,
    });
    setHasMoved(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - canvasRect.left) / zoom - dragOffset.x;
    const rawY = (e.clientY - canvasRect.top) / zoom - dragOffset.y;

    // Dynamic clamping to full canvas dimensions
    const maxX = CANVAS_WIDTH - NODE_WIDTH - 15;
    const maxY = CANVAS_HEIGHT - NODE_HEIGHT - 15;
    const clampedX = Math.max(12, Math.min(rawX, maxX));
    const clampedY = Math.max(12, Math.min(rawY, maxY));

    setHasMoved(true);
    setLocalNodes((prev) =>
      prev.map((n) =>
        n.id === draggingId
          ? { ...n, position: { x: Math.round(clampedX), y: Math.round(clampedY) } }
          : n
      )
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const finishedNodeId = draggingId;
    setDraggingId(null);

    if (hasMoved) {
      onUpdateNodes(localNodes);
    } else {
      const targetNode = localNodes.find((n) => n.id === finishedNodeId);
      if (targetNode) {
        setSelectedNode(targetNode);
        setIsEditModalOpen(true);
      }
    }
  };

  const handleSaveNode = (updatedNode: RoadmapNode) => {
    const updatedList = localNodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
    setLocalNodes(updatedList);
    onUpdateNodes(updatedList);
  };

  const handleAddNode = () => {
    const phaseKey =
      attemptState.currentPhase === 1
        ? 'DIAGNOSE'
        : attemptState.currentPhase === 2
        ? 'DECIDE'
        : 'PILOT';

    const stageX =
      attemptState.currentPhase === 1 ? 160 : attemptState.currentPhase === 2 ? 550 : 830;
    const newY = 160 + (localNodes.length % 3) * 60;

    const newNode: RoadmapNode = {
      id: `custom-node-${Date.now()}`,
      phaseId: attemptState.currentPhase,
      category: phaseKey as any,
      title: 'New Milestone Strategy',
      context: 'Define trigger event, baseline hypothesis, and scope...',
      purpose: 'Establish operational objective and quantitative outcome...',
      tradeoffs: 'Document risks and rejected alternatives...',
      owner: 'Lead Candidate',
      dependencies: 'Prior Phase Milestones',
      targetMilestone: `Phase ${attemptState.currentPhase}`,
      triggerThreshold: 'Variance > 10%',
      isComplete: false,
      position: { x: stageX, y: newY },
    };

    const nextList = [...localNodes, newNode];
    setLocalNodes(nextList);
    onUpdateNodes(nextList);
    setSelectedNode(newNode);
    setIsEditModalOpen(true);
  };

  const handleResetLayout = () => {
    setLocalNodes(trackConfig.roadmapNodes);
    onUpdateNodes(trackConfig.roadmapNodes);
  };

  const handleScrollToStage = (stageX: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: stageX * zoom,
        behavior: 'smooth',
      });
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setIsFitWidth(false);
    setZoom(Number(Math.min(1.25, Math.max(0.6, newZoom)).toFixed(2)));
  };

  // Filtered nodes
  const displayNodes = useMemo(() => {
    return filterCategory === 'ALL'
      ? localNodes
      : localNodes.filter((n) => n.category === filterCategory);
  }, [localNodes, filterCategory]);

  const completedCount = localNodes.filter((n) => n.isComplete).length;
  const totalCount = localNodes.length;

  // Real-time dynamic SVG connection lines hook
  const connectionLines = useRoadmapCoordinates({
    nodes: localNodes,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <GitBranch className="w-4 h-4 text-[#1A1A1A]" />
            <h2 className="text-sm font-medium text-[#1A1A1A] tracking-tight">
              Operational Roadmap & Node Graph
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F5F5F5] border border-[#EBEBEB] text-[#1A1A1A] font-mono font-medium">
              {completedCount} / {totalCount} Nodes Complete
            </span>
          </div>
          <p className="text-xs text-[#777] font-light mt-1">
            Reposition milestones, examine dependencies across all 4 stages, and evaluate branch decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Collapse/Expand AI Copilot Button (Specifically for Roadmap Canvas Space) */}
          {onToggleCopilot && (
            <button
              type="button"
              onClick={onToggleCopilot}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium tracking-tight flex items-center space-x-1.5 transition-colors ${
                isCopilotOpen
                  ? 'bg-[#FAFAFA] border-[#EBEBEB] text-[#555] hover:text-black hover:bg-neutral-100'
                  : 'bg-black text-white border-black hover:bg-neutral-800'
              }`}
              title={
                isCopilotOpen
                  ? 'Collapse AI Copilot panel to maximize roadmap graph width'
                  : 'Expand AI Copilot panel'
              }
            >
              {isCopilotOpen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Collapse Chatbot for Space</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Show AI Copilot</span>
                </>
              )}
            </button>
          )}

          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-[#FAFAFA] border border-[#EBEBEB] p-1 rounded-lg text-xs">
            {['ALL', 'DIAGNOSE', 'ANALYZE', 'DECIDE', 'PILOT'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filterCategory === cat
                    ? 'bg-black text-white'
                    : 'text-[#666] hover:text-[#1A1A1A]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Reset Layout */}
          <button
            type="button"
            onClick={handleResetLayout}
            className="p-2 border border-[#EBEBEB] rounded-lg text-[#666] hover:text-black hover:bg-[#FAFAFA] transition-colors"
            title="Reset Canvas Node Layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Add Custom Node */}
          <button
            type="button"
            onClick={handleAddNode}
            className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Node</span>
          </button>
        </div>
      </div>

      {/* Stage Fast Jump & Zoom Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EBEBEB] rounded-xl px-4 py-3 text-xs">
        {/* Stage Fast Jump Navigation */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] font-mono text-[#888] mr-1 uppercase">Stage Jump:</span>
          {STAGES.map((stg) => {
            const stageNodeCount = localNodes.filter((n) => {
              if (stg.key === 'PILOT') return n.category === 'PILOT' || n.category === 'REVISE';
              return n.category === stg.key;
            }).length;

            return (
              <button
                key={stg.key}
                type="button"
                onClick={() => handleScrollToStage(stg.xStart)}
                className="px-2.5 py-1 bg-[#FAFAFA] hover:bg-neutral-100 text-[#444] hover:text-black border border-[#EBEBEB] rounded-md text-[11px] font-medium flex items-center space-x-1 shrink-0 transition-colors"
              >
                <span>{stg.label}</span>
                <span className="text-[9px] text-[#888] font-mono bg-white px-1 rounded border border-[#EBEBEB]">
                  {stageNodeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsFitWidth(true);
              updateFitScale();
            }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              isFitWidth
                ? 'bg-black text-white border-black'
                : 'bg-[#FAFAFA] text-[#666] border-[#EBEBEB] hover:text-black'
            }`}
            title="Auto fit all stages to available screen width"
          >
            Fit Width
          </button>

          <div className="flex items-center space-x-1 border border-[#EBEBEB] rounded-md p-0.5 bg-[#FAFAFA]">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom - 0.1)}
              className="p-1 text-[#666] hover:text-black rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-[#444] px-1.5 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom + 0.1)}
              className="p-1 text-[#666] hover:text-black rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleZoomChange(1.0)}
            className="px-2 py-1 text-[11px] text-[#666] hover:text-black border border-[#EBEBEB] rounded-md bg-[#FAFAFA]"
            title="100% Zoom"
          >
            100%
          </button>
        </div>
      </div>

      {/* Visual Roadmap Canvas Card with Responsive Scroll / Fit Container */}
      <div
        ref={containerRef}
        className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden shadow-xs"
      >
        {/* Stage Columns Label Header (Synchronized with Canvas Stage Coordinates) */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-hidden bg-[#FCFCFC]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            style={{
              width: `${CANVAS_WIDTH * zoom}px`,
              minWidth: `${CANVAS_WIDTH * zoom}px`,
            }}
          >
            {/* Stage Header */}
            <div
              className="grid grid-cols-4 border-b border-[#EBEBEB] bg-[#FAFAFA] text-[11px] text-center font-mono select-none"
              style={{
                width: `${CANVAS_WIDTH}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              {STAGES.map((stg, sIdx) => (
                <div
                  key={stg.key}
                  className={`p-3 flex flex-col items-center justify-center ${
                    sIdx !== STAGES.length - 1 ? 'border-r border-[#EBEBEB]' : ''
                  }`}
                >
                  <span className="font-semibold text-[#1A1A1A] tracking-wide">{stg.label}</span>
                  <span className="text-[10px] text-[#888] font-light mt-0.5">{stg.subtext}</span>
                </div>
              ))}
            </div>

            {/* Interactive Canvas Viewport */}
            <div
              style={{
                width: `${CANVAS_WIDTH * zoom}px`,
                height: `${CANVAS_HEIGHT * zoom}px`,
                position: 'relative',
              }}
            >
              <div
                ref={canvasRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute top-0 left-0 bg-[#FCFCFC] select-none"
                style={{
                  width: `${CANVAS_WIDTH}px`,
                  height: `${CANVAS_HEIGHT}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, #E5E5E5 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              >
                {/* Stage Background Column Dividers */}
                <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                  <div className="border-r border-dashed border-[#E5E5E5]" />
                  <div className="border-r border-dashed border-[#E5E5E5]" />
                  <div className="border-r border-dashed border-[#E5E5E5]" />
                  <div className="" />
                </div>

                {/* SVG Connection Paths */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <marker
                      id="arrowhead-default"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#999999" />
                    </marker>
                    <marker
                      id="arrowhead-active"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#000000" />
                    </marker>
                  </defs>

                  {connectionLines.map((line) => (
                    <path
                      key={line.id}
                      d={line.pathD}
                      fill="none"
                      stroke={line.isComplete ? '#000000' : '#CCCCCC'}
                      strokeWidth={line.isComplete ? '2' : '1.5'}
                      strokeDasharray={line.isComplete ? 'none' : '4 3'}
                      markerEnd={
                        line.isComplete ? 'url(#arrowhead-active)' : 'url(#arrowhead-default)'
                      }
                    />
                  ))}
                </svg>

                {/* Draggable Node Cards */}
                {displayNodes.map((node) => {
                  const posX = node.position?.x ?? 50;
                  const posY = node.position?.y ?? 100;
                  const isDragging = draggingId === node.id;

                  return (
                    <div
                      key={node.id}
                      onPointerDown={(e) => handlePointerDown(e, node)}
                      style={{
                        transform: `translate(${posX}px, ${posY}px)`,
                        width: `${NODE_WIDTH}px`,
                      }}
                      className={`absolute top-0 left-0 z-10 bg-white border rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-shadow duration-100 ${
                        isDragging
                          ? 'shadow-xl ring-2 ring-black z-30 cursor-grabbing'
                          : 'shadow-xs hover:shadow-md'
                      } ${
                        node.isComplete
                          ? 'border-black ring-1 ring-black/10'
                          : node.isRevisedAfterConstraint
                          ? 'border-neutral-400'
                          : 'border-[#EBEBEB]'
                      }`}
                    >
                      {/* Node Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-medium uppercase border border-[#EBEBEB] bg-[#FAFAFA] text-[#1A1A1A]">
                          {node.category}
                        </span>

                        <div className="flex items-center space-x-1.5">
                          {node.isRevisedAfterConstraint && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FAFAFA] text-[#1A1A1A] border border-[#EBEBEB] font-mono">
                              REVISED
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveNode({ ...node, isComplete: !node.isComplete });
                            }}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                              node.isComplete
                                ? 'bg-black text-white'
                                : 'bg-[#FAFAFA] border border-[#DDD] text-[#999] hover:border-black'
                            }`}
                            title={node.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
                          >
                            {node.isComplete ? <Check className="w-2.5 h-2.5" /> : null}
                          </button>
                        </div>
                      </div>

                      {/* Node Title */}
                      <h4 className="text-xs font-medium text-[#1A1A1A] line-clamp-1">
                        {node.title}
                      </h4>

                      {/* Purpose / Context */}
                      <p className="text-[10px] text-[#666] font-light line-clamp-2 mt-1 leading-snug">
                        {node.purpose || node.context}
                      </p>

                      {/* Node Footer */}
                      <div className="mt-2.5 pt-2 border-t border-[#F0F0F0] flex items-center justify-between text-[9px] text-[#888] font-mono">
                        <span className="truncate max-w-[100px]">{node.owner || 'Analyst'}</span>
                        <span>{node.targetMilestone || 'Phase 1'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Branching Decisions in Roadmap */}
      {trackConfig.branchingDecisions && trackConfig.branchingDecisions.length > 0 && (
        <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3.5">
            <div>
              <div className="flex items-center space-x-2">
                <GitBranch className="w-4 h-4 text-[#1A1A1A]" />
                <h3 className="font-medium text-[#1A1A1A] text-sm tracking-tight">
                  Strategic Branching Posture & Node Rationale
                </h3>
              </div>
              <p className="text-xs text-[#777] font-light mt-0.5">
                Configure your strategic branch paths, evaluate tradeoffs, and document justification.
              </p>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-[#777] font-mono">
              Phase {attemptState.currentPhase} Scope
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {trackConfig.branchingDecisions
              .filter((d) => d.phaseId <= Math.min(2,attemptState.currentPhase))
              .map((dec) => {
                const currentResponse = attemptState.roadmapResponses[dec.id] || {
                  nodeId: dec.id,
                  rationale: '',
                  isComplete: false,
                };

                return (
                  <div
                    key={dec.id}
                    className="border border-[#EBEBEB] rounded-xl p-4 bg-[#FAFAFA] space-y-3"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-black text-white text-[10px] font-bold flex items-center justify-center font-mono">
                        {dec.decisionNumber}
                      </span>
                      <h4 className="font-medium text-[#1A1A1A] text-xs">{dec.title}</h4>
                    </div>

                    <p className="text-[11px] text-[#666] font-light">{dec.prompt}</p>

                    <div className="space-y-2">
                      {dec.options.map((opt) => {
                        const isSelected = currentResponse.selectedOption === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              onSelectDecisionOption &&
                              onSelectDecisionOption(dec.id, opt.id, currentResponse.rationale)
                            }
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                              isSelected
                                ? 'bg-white border-black text-[#1A1A1A] font-medium shadow-xs'
                                : 'bg-white border-[#EBEBEB] hover:bg-[#FAFAFA] text-[#666]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={isSelected ? 'text-black font-medium' : ''}>
                                {opt.label}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white font-mono font-medium">
                                  Selected
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <p className="text-[10px] text-[#888] font-light mt-1 leading-snug">
                                {opt.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {(['rejectedAlternatives','dependencies','owner','timing','triggerThreshold'] as const).map(field => <label key={field} className="block text-xs">{{rejectedAlternatives:'Why reject the alternatives?',dependencies:'Dependencies',owner:'Accountable owner',timing:'Timing / milestone',triggerThreshold:'Evidence threshold to change course'}[field]}<textarea disabled={attemptState.isSubmitted} value={currentResponse[field] || ''} onChange={e => onSelectDecisionOption?.(dec.id,currentResponse.selectedOption || '',currentResponse.rationale,{[field]:e.target.value})} className="mt-1 border rounded-lg p-2 w-full bg-white"/></label>)}
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#999] block mb-1">
                        Branch Rationale & Tradeoffs
                      </label>
                      <textarea
                        value={currentResponse.rationale || ''}
                        onChange={(e) =>
                          onSelectDecisionOption &&
                          onSelectDecisionOption(
                            dec.id,
                            currentResponse.selectedOption || dec.options[0].id,
                            e.target.value
                          )
                        }
                        rows={2}
                        placeholder="Why this path? What alternatives were rejected?"
                        className="w-full text-xs p-2.5 rounded-lg border border-[#EBEBEB] focus:border-black focus:ring-1 focus:ring-black outline-none bg-white text-[#1A1A1A] placeholder:text-[#AAA]"
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Node Edit Modal */}
      <NodeEditModal
        node={selectedNode}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveNode}
      />
    </div>
  );
};
