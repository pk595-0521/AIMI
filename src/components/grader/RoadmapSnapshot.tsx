import React from 'react';
export function RoadmapSnapshot({ nodes }: { nodes: any[] }) {
  const normalized = nodes.map(n => ({ ...n, key: n.key || n.id, x: n.positionX ?? n.position?.x ?? 0, y: n.positionY ?? n.position?.y ?? 0 }));
  const width = Math.max(700, ...normalized.map(n => n.x + 270));
  const height = Math.max(180, ...normalized.map(n => n.y + 120));
  return <div className="space-y-3">
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[650px]" aria-label="Roadmap snapshot">
      {normalized.flatMap(n => (n.connectsTo || []).map((key: string) => {
        const target = normalized.find(t => t.key === key); if (!target) return null;
        return <path key={`${n.key}-${key}`} d={`M ${n.x + 240} ${n.y + 45} C ${n.x + 280} ${n.y + 45}, ${target.x - 40} ${target.y + 45}, ${target.x} ${target.y + 45}`} fill="none" stroke="#999" strokeDasharray="4 4"/>;
      }))}
      {normalized.map(n => <g key={n.key} transform={`translate(${n.x} ${n.y})`}><title>{n.title}</title><rect width="240" height="90" rx="12" fill="#fafafa" stroke="#bbb"/><text x="12" y="24" fontSize="12">{n.category}</text><text x="12" y="49" fontSize="14">{n.title.slice(0,28)}</text><text x="12" y="72" fontSize="12">{(n.owner || 'No owner').slice(0,32)}</text></g>)}
    </svg></div>
    <details><summary className="text-sm cursor-pointer">Inspect node details ({nodes.length})</summary>{normalized.map(n => <article key={n.key} className="border-b py-3 text-sm space-y-1"><strong>{n.title}</strong><p>{n.context}</p><p>Purpose: {n.purpose}</p><p>Tradeoffs: {n.tradeoffs}</p><p>Owner: {n.owner || 'Unspecified'} · Milestone: {n.targetMilestone || 'Unspecified'}</p><p>Dependencies: {n.dependencies || 'Unspecified'}</p><p>Change threshold: {n.triggerThreshold || 'Unspecified'}</p></article>)}</details>
  </div>;
}
