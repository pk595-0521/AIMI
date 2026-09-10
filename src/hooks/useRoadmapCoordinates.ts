import { useMemo } from 'react';
import { RoadmapNode } from '../types';

export interface ConnectionPath {
  id: string;
  sourceId: string;
  targetId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pathD: string;
  isComplete: boolean;
}

interface UseRoadmapCoordinatesOptions {
  nodes: RoadmapNode[];
  nodeWidth: number;
  nodeHeight: number;
}

/**
 * Custom hook that tracks real-time node coordinates on the Roadmap Builder canvas.
 * Recalculates anchor points and smooth SVG bezier curves whenever nodes move or resize,
 * ensuring lines stay securely anchored without visual breaking or offset.
 */
export function useRoadmapCoordinates({
  nodes,
  nodeWidth,
  nodeHeight,
}: UseRoadmapCoordinatesOptions): ConnectionPath[] {
  return useMemo(() => {
    const lines: ConnectionPath[] = [];
    const nodeMap = new Map<string, RoadmapNode>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    for (const src of nodes) {
      if (!src.connectsTo || src.connectsTo.length === 0 || !src.position) {
        continue;
      }

      for (const targetId of src.connectsTo) {
        const tgt = nodeMap.get(targetId);
        if (!tgt || !tgt.position) continue;

        // Source right-center anchor
        const x1 = src.position.x + nodeWidth;
        const y1 = src.position.y + nodeHeight / 2;

        // Target left-center anchor
        const x2 = tgt.position.x;
        const y2 = tgt.position.y + nodeHeight / 2;

        // Dynamic bezier curvature calculation
        const deltaX = x2 - x1;
        const dx = Math.max(35, Math.abs(deltaX) * 0.45);

        // Cubic bezier path: M x1 y1 C x1+dx y1, x2-dx y2, x2 y2
        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        lines.push({
          id: `${src.id}->${tgt.id}`,
          sourceId: src.id,
          targetId: tgt.id,
          x1,
          y1,
          x2,
          y2,
          pathD,
          isComplete: Boolean(src.isComplete && tgt.isComplete),
        });
      }
    }

    return lines;
  }, [nodes, nodeWidth, nodeHeight]);
}
