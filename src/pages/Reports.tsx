import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'classnames';
import { ReviewHistoryItem, ReviewLogEntry } from '../types';
import { listLogsForReview, formatReviewAuditReport, deleteReviewRun } from '../services/reviewStore';

interface ReportsProps {
  history: ReviewHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  searchQuery?: string;
}

const Reports: React.FC<ReportsProps> = ({ history, isLoading, error, onRefresh, searchQuery = '' }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ReviewLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return history;
    return history.filter(
      (item) =>
        item.metadata.fileName.toLowerCase().includes(query) ||
        item.metadata.artifactType.toLowerCase().includes(query) ||
        item.provider.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query) ||
        item.standards.some((s) => s.toLowerCase().includes(query)) ||
        item.comments.some((c) => c.title.toLowerCase().includes(query) || c.details.toLowerCase().includes(query)) ||
        item.recommendations.some((r) => r.title.toLowerCase().includes(query)),
    );
  }, [history, searchQuery]);

  const activeSelectedId = useMemo(() => {
    if (selectedId && filteredHistory.some((item) => item.id === selectedId)) {
      return selectedId;
    }
    return filteredHistory[0]?.id ?? null;
  }, [filteredHistory, selectedId]);

  useEffect(() => {
    if (!activeSelectedId) {
      return;
    }
    let cancelled = false;
    const fetchLogs = async () => {
      try {
        setLogsLoading(true);
        const entries = await listLogsForReview(activeSelectedId);
        if (!cancelled) {
          setLogs(entries);
          setLogsError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLogsError(err?.message ?? 'Unable to load review logs.');
        }
      } finally {
        if (!cancelled) {
          setLogsLoading(false);
        }
      }
    };
    fetchLogs();
    return () => {
      cancelled = true;
    };
  }, [activeSelectedId]);

  const selectedReview = useMemo(
    () => history.find((item) => item.id === activeSelectedId) ?? null,
    [history, activeSelectedId],
  );

  const logStats = useMemo(() => {
    return logs.reduce(
      (acc, entry) => {
        acc.total += 1;
        acc[entry.level] = (acc[entry.level] ?? 0) + 1;
        return acc;
      },
      { total: 0, info: 0, warn: 0, error: 0 },
    );
  }, [logs]);

  const handleExportMarkdown = () => {
    if (!selectedReview) return;
    const markdown = formatReviewAuditReport(selectedReview, logs);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = selectedReview.metadata.fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `compliance-audit-${safeName}-${new Date(selectedReview.timestamp).getTime()}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setActionFeedback('Markdown audit report downloaded.');
    window.setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleExportJson = () => {
    if (!selectedReview) return;
    const payload = {
      review: selectedReview,
      auditLogs: logs,
      exportedAt: new Date().toISOString(),
      complianceVersion: '0.1.0',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = selectedReview.metadata.fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `compliance-manifest-${safeName}-${new Date(selectedReview.timestamp).getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setActionFeedback('JSON audit bundle downloaded.');
    window.setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleDelete = async () => {
    if (!selectedReview) return;
    if (window.confirm(`Are you sure you want to delete the review for "${selectedReview.metadata.fileName}"?`)) {
      await deleteReviewRun(selectedReview.id);
      await onRefresh();
      setActionFeedback('Review record deleted.');
      window.setTimeout(() => setActionFeedback(null), 2500);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Review History</h2>
            <p className="text-xs text-gray-500">
              {filteredHistory.length} {filteredHistory.length === 1 ? 'record' : 'records'} stored locally.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-lg border border-cyan-500 bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-cyan-400"
          >
            Refresh
          </button>
        </header>

        {searchQuery && (
          <p className="text-[11px] text-cyan-300">
            Filtering by query: &ldquo;{searchQuery}&rdquo; ({filteredHistory.length} matches)
          </p>
        )}

        {error && <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        {actionFeedback && (
          <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
            {actionFeedback}
          </p>
        )}

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-200">
              Loading review history…
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400">
              {searchQuery ? 'No reviews matched your search.' : 'No stored reviews yet. Run a compliance review to populate this list.'}
            </div>
          ) : (
            filteredHistory.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={clsx(
                  'w-full rounded-xl border px-4 py-3 text-left transition',
                  item.id === activeSelectedId
                    ? 'border-cyan-500 bg-cyan-500/15 text-gray-50'
                    : 'border-gray-700 bg-gray-900/60 text-gray-200 hover:border-cyan-500/40 hover:text-gray-50',
                )}
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <span className="truncate max-w-[120px]">{item.metadata.fileName}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-100 uppercase">{item.metadata.artifactType}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {item.provider.toUpperCase()} · {item.model} · {item.standards.join(', ')}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
        {!selectedReview ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Select a review on the left to inspect results.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700/60 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Review Details</h2>
                <p className="text-xs text-gray-500">
                  Duration {selectedReview.durationSeconds ? `${selectedReview.durationSeconds.toFixed(1)}s` : 'n/a'} ·{' '}
                  {selectedReview.metadata.fileName} ({selectedReview.provider.toUpperCase()} · {selectedReview.model})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="rounded-lg border border-cyan-500/60 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
                >
                  Export Markdown
                </button>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-cyan-500/60 hover:text-cyan-200"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/20"
                >
                  Delete
                </button>
              </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-sm text-gray-300">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Original Artifact</h3>
                <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-gray-400">
                  {selectedReview.originalText.slice(0, 1500) || 'No content captured.'}
                </p>
              </article>
              <article className="rounded-xl border border-gray-700 bg-gray-900/70 p-4 text-sm text-gray-300">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">AI Findings Markdown</h3>
                <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-gray-400">
                  {selectedReview.reviewMarkdown.slice(0, 1500) || 'No review markdown captured.'}
                </p>
              </article>
            </section>

            <section className="rounded-xl border border-gray-700 bg-gray-900/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Audit Log</h3>
                {logs.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                    <span>Total {logStats.total}</span>
                    <span className="text-cyan-300">Info {logStats.info}</span>
                    <span className="text-amber-200">Warn {logStats.warn}</span>
                    <span className="text-rose-300">Error {logStats.error}</span>
                  </div>
                )}
              </div>
              {logsError && (
                <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">{logsError}</p>
              )}
              <div className="mt-2 max-h-48 overflow-y-auto text-xs text-gray-400">
                {logsLoading ? (
                  <p className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-cyan-200">Loading log…</p>
                ) : logs.length === 0 ? (
                  <p>No log entries recorded for this review.</p>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((entry) => (
                      <li key={entry.id}>
                        <span className="text-gray-500">{new Date(entry.timestamp).toLocaleString()} · </span>
                        <span
                          className={clsx(
                            'font-semibold',
                            entry.level === 'error' && 'text-rose-300',
                            entry.level === 'warn' && 'text-amber-200',
                            entry.level === 'info' && 'text-cyan-200',
                          )}
                        >
                          {entry.level.toUpperCase()}
                        </span>
                        <span className="text-gray-300"> — {entry.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  );
};

export default Reports;
