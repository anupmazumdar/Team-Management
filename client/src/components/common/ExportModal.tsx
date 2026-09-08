import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, Download, FileJson, FileSpreadsheet, ShieldAlert, CheckCircle2, Database } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, teamName }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (type: 'workspace' | 'tasks' | 'team' | 'activity', filename: string) => {
    setDownloading(type);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = `/export/${type}`;
      const response = await api.get(endpoint, {
        responseType: 'blob',
      });

      // Create download anchor
      const blob = new Blob([response.data], {
        type: type === 'workspace' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(`Export of ${type.toUpperCase()} completed successfully.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Export download failed:', err);
      setError(err.response?.data?.error || 'Failed to download export file.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Workspace Data</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Download database records, deliverables, and audit logs for {teamName}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* 1. Full Workspace JSON */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start gap-3">
                <FileJson className="w-5 h-5 text-indigo-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Full Workspace Backup (JSON)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Complete hierarchical backup of all projects, tasks, reviews, and logs.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload('workspace', `workspace-backup-${Date.now()}.json`)}
                disabled={!!downloading}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'workspace' ? 'Exporting...' : 'JSON'}</span>
              </button>
            </div>

            {/* 2. Tasks & Deliverables CSV */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Tasks & SLA Deliverables (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Spreadsheet with mission details, deadlines, acceptance & delivery timestamps.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload('tasks', `tasks-deliverables-${Date.now()}.csv`)}
                disabled={!!downloading}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'tasks' ? 'Exporting...' : 'CSV'}</span>
              </button>
            </div>

            {/* 3. Team Scorecard CSV */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-amber-500/40 transition-colors">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Team Governance & Scorecard (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Member metrics: approval ratings, on-time SLA percentages, and assigned counts.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload('team', `team-scorecard-${Date.now()}.csv`)}
                disabled={!!downloading}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'team' ? 'Exporting...' : 'CSV'}</span>
              </button>
            </div>

            {/* 4. Verification Audit Logs CSV */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-purple-500/40 transition-colors">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Audit Trail & Verification Snapshots (CSV)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Immutable history of reviewer decisions, role snapshots, and state transitions.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload('activity', `audit-trail-${Date.now()}.csv`)}
                disabled={!!downloading}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === 'activity' ? 'Exporting...' : 'CSV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
