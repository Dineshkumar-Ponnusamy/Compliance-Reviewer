import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'classnames';
import { ReviewHistoryItem, ReviewLogEntry } from '../types';
import { listLogsForReview } from '../services/reviewStore';

interface ReportsProps {
  history: ReviewHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
}

const Reports: React.FC<ReportsProps> = ({ history, isLoading, error, onRefresh }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ReviewLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    if (!history.length) {
      setSelectedId(null);
      setLogs([]);
      setLogsError(null);
      return;
    }
    if (!selectedId || !history.some((item) => item.id === selectedId)) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setLogs([]);
      setLogsError(null);
      return;
    }
    let cancelled = false;
    const fetchLogs = async () => {
      try {
        setLogsLoading(true);
        const entries = await listLogsForReview(selectedId);
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
  }, [selectedId]);

  const selectedReview = useMemo(
    () => history.find((item) => item.id === selectedId) ?? null,
    [history, selectedId],
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

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Review History</h2>
            <p className="text-xs text-gray-500">Stored locally in your browser.</p>
          </div>
          <button
            type="button"
            onClick={() => onRefresh()}
            className="rounded-lg border border-cyan-500 bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-gray-900 transition hover:bg-cyan-400"
          >
            Refresh
          </button>
        </header>
        {error && <p className="rounded-lg border border-rose-500/50 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 text-sm text-cyan-200">
              Loading review history…
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400">
              No stored reviews yet. Run a compliance review to populate this list.
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={clsx(
                  'w-full rounded-xl border px-4 py-3 text-left transition',
                  item.id === selectedId
                    ? 'border-cyan-500 bg-cyan-500/15 text-gray-50'
                    : 'border-gray-700 bg-gray-900/60 text-gray-200 hover:border-cyan-500/40 hover:text-gray-50',
                )}
              >
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(item.timestamp).toLocaleString()}</span>
                  <span>{item.metadata.fileName}</span>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-100">{item.metadata.artifactType}</div>
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
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Review Details</h2>
                <p className="text-xs text-gray-500">
                  Duration {selectedReview.durationSeconds ? `${selectedReview.durationSeconds.toFixed(1)}s` : 'n/a'} ·{' '}
                  {selectedReview.metadata.fileName}
                </p>
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
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">AI Highlights</h3>
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
