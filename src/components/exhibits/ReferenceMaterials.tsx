import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  Layers,
  Database,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { Exhibit, TrackConfig } from '../../types';

interface ReferenceMaterialsProps {
  trackConfig: TrackConfig;
  targetExhibitId?: string;
  onSelectExhibit?: (id: string) => void;
}

export const ReferenceMaterials: React.FC<ReferenceMaterialsProps> = ({
  trackConfig,
  targetExhibitId,
  onSelectExhibit,
}) => {
  const [selectedExhibitId, setSelectedExhibitId] = useState<string>(() => {
    return targetExhibitId || trackConfig.exhibits[0]?.id || '';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize when targetExhibitId changes from navigation deep-links
  React.useEffect(() => {
    if (targetExhibitId && trackConfig.exhibits.some((e) => e.id === targetExhibitId)) {
      setSelectedExhibitId(targetExhibitId);
    }
  }, [targetExhibitId, trackConfig.exhibits]);

  const handleSelect = (id: string) => {
    setSelectedExhibitId(id);
    if (onSelectExhibit) onSelectExhibit(id);
  };

  const activeExhibit =
    trackConfig.exhibits.find((e) => e.id === selectedExhibitId) ||
    trackConfig.exhibits[0];

  const handleDownloadCsv = (exhibit: Exhibit) => {
    if (!exhibit.tableColumns || !exhibit.tableRows) return;
    const headers = exhibit.tableColumns.map((c) => c.header).join(',');
    const rows = exhibit.tableRows
      .map((row) =>
        exhibit.tableColumns!.map((c) => `"${row[c.key] || ''}"`).join(',')
      )
      .join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      exhibit.downloadFilename || `exhibit_${exhibit.number}_data.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-4 h-4 text-[#1A1A1A]" />
          <div>
            <h2 className="text-sm font-medium text-[#1A1A1A] tracking-tight">
              Reference Materials & Case Exhibits
            </h2>
            <p className="text-xs text-[#777] font-light mt-0.5">
              Access quantitative models, stakeholder interviews, trial logs, and raw datasets.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Exhibit Selector Cards */}
        <div className="lg:col-span-1 space-y-2.5">
          {trackConfig.exhibits.map((exhibit) => {
            const isSelected = exhibit.id === selectedExhibitId;
            return (
              <button
                key={exhibit.id}
                onClick={() => setSelectedExhibitId(exhibit.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col space-y-1.5 ${
                  isSelected
                    ? 'bg-white border-black ring-1 ring-black/10'
                    : 'bg-white border-[#EBEBEB] hover:border-black text-[#555]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A]">
                    EXHIBIT {exhibit.number}
                  </span>
                  <span className="text-[10px] text-[#999] uppercase font-mono">
                    {exhibit.type}
                  </span>
                </div>
                <h4
                  className={`text-xs font-medium ${
                    isSelected ? 'text-[#1A1A1A]' : 'text-[#333]'
                  }`}
                >
                  {exhibit.title}
                </h4>
                <p className="text-[11px] text-[#777] font-light line-clamp-1">
                  {exhibit.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Exhibit Detail View */}
        <div className="lg:col-span-3 bg-white border border-[#EBEBEB] rounded-xl p-8 space-y-5 min-h-[500px]">
          {activeExhibit && (
            <div className="space-y-5">
              {/* Exhibit Header */}
              <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F5F5F5] border border-[#EBEBEB] text-[#1A1A1A] font-mono font-medium">
                      Exhibit {activeExhibit.number}
                    </span>
                    <h3 className="text-sm font-medium text-[#1A1A1A]">
                      {activeExhibit.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[#777] font-light mt-1">
                    {activeExhibit.subtitle}
                  </p>
                </div>

                {activeExhibit.tableRows && (
                  <button
                    onClick={() => handleDownloadCsv(activeExhibit)}
                    className="px-4 py-2 bg-white hover:bg-[#F5F5F5] text-[#1A1A1A] rounded-full text-xs font-medium tracking-wide flex items-center space-x-1.5 transition-colors border border-[#EBEBEB]"
                  >
                    <Download className="w-3.5 h-3.5 text-[#555]" />
                    <span>Download CSV</span>
                  </button>
                )}
              </div>

              {/* Text content */}
              {activeExhibit.content && (
                <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-5 text-xs text-[#444] leading-relaxed whitespace-pre-line font-mono font-light">
                  {activeExhibit.content}
                </div>
              )}

              {/* Data Table */}
              {activeExhibit.tableColumns && activeExhibit.tableRows && (
                <div className="border border-[#EBEBEB] rounded-xl overflow-hidden">
                  <div className="bg-[#FAFAFA] px-4 py-2.5 border-b border-[#EBEBEB] flex items-center justify-between text-xs font-mono text-[#555] font-medium">
                    <span>
                      Dataset Records ({activeExhibit.tableRows.length} rows)
                    </span>
                    <span className="text-[10px] text-[#999]">
                      Raw Data View
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#1A1A1A] font-mono">
                        <tr>
                          {activeExhibit.tableColumns.map((col) => (
                            <th key={col.key} className="px-4 py-2.5 font-medium text-[11px]">
                              {col.header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBEBEB] font-mono text-[11px]">
                        {activeExhibit.tableRows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-[#FAFAFA] transition-colors"
                          >
                            {activeExhibit.tableColumns!.map((col) => (
                              <td key={col.key} className="px-4 py-2.5 text-[#333]">
                                {row[col.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* AI Sample Full Text */}
              {activeExhibit.type === 'ai-sample' && activeExhibit.aiSampleText && (
                <div className="p-5 rounded-xl bg-[#FAFAFA] border border-[#EBEBEB] text-[#1A1A1A] space-y-2">
                  <span className="font-mono text-[10px] font-medium text-[#777] uppercase block tracking-wider">
                    AI OUTPUT SAMPLE TRANSCRIPT
                  </span>
                  <p className="text-xs leading-relaxed bg-white p-4 rounded-lg border border-[#EBEBEB] text-[#444] font-light">
                    {activeExhibit.aiSampleText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
