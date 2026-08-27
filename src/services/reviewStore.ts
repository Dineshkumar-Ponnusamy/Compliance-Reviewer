import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { ReviewHistoryItem, ReviewLogEntry } from '../types';

interface ReviewStoreSchema extends DBSchema {
  reviewRuns: {
    key: string;
    value: ReviewHistoryItem;
    indexes: { by_timestamp: string };
  };
  reviewLogs: {
    key: string;
    value: ReviewLogEntry;
    indexes: { by_review: string; by_timestamp: string };
  };
}

const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const DB_NAME = 'complianceReviewer';
const DB_VERSION = 1;
const RUN_STORE = 'reviewRuns';
const LOG_STORE = 'reviewLogs';

let dbPromise: Promise<IDBPDatabase<ReviewStoreSchema>> | null = null;

const getDb = () => {
  if (!isBrowser) {
    throw new Error('IndexedDB is not available in this environment.');
  }
  if (!dbPromise) {
    dbPromise = openDB<ReviewStoreSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(RUN_STORE)) {
          const runStore = db.createObjectStore(RUN_STORE, { keyPath: 'id' });
          runStore.createIndex('by_timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(LOG_STORE)) {
          const logStore = db.createObjectStore(LOG_STORE, { keyPath: 'id' });
          logStore.createIndex('by_review', 'reviewId');
          logStore.createIndex('by_timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

export const saveReviewRun = async (run: ReviewHistoryItem) => {
  if (!isBrowser) return;
  const db = await getDb();
  await db.put(RUN_STORE, run);
};

export const appendLogEntry = async (entry: ReviewLogEntry) => {
  if (!isBrowser) return;
  const db = await getDb();
  await db.add(LOG_STORE, entry);
};

export const listReviewRuns = async (): Promise<ReviewHistoryItem[]> => {
  if (!isBrowser) return [];
  const db = await getDb();
  const index = db.transaction(RUN_STORE).store.index('by_timestamp');
  const runs = await index.getAll();
  return runs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const listLogsForReview = async (reviewId: string): Promise<ReviewLogEntry[]> => {
  if (!isBrowser) return [];
  const db = await getDb();
  const index = db.transaction(LOG_STORE).store.index('by_review');
  const logs = await index.getAll(reviewId);
  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const deleteReviewRun = async (reviewId: string) => {
  if (!isBrowser) return;
  const db = await getDb();
  const tx = db.transaction([RUN_STORE, LOG_STORE], 'readwrite');
  await tx.objectStore(RUN_STORE).delete(reviewId);
  
  const logIndex = tx.objectStore(LOG_STORE).index('by_review');
  const logKeys = await logIndex.getAllKeys(reviewId);
  for (const key of logKeys) {
    await tx.objectStore(LOG_STORE).delete(key);
  }
  await tx.done;
};

export const clearReviewData = async () => {
  if (!isBrowser) return;
  const db = await getDb();
  await Promise.all([db.clear(RUN_STORE), db.clear(LOG_STORE)]);
};

export const formatReviewAuditReport = (
  run: ReviewHistoryItem,
  logs: ReviewLogEntry[] = [],
): string => {
  const date = new Date(run.timestamp).toISOString();
  return `# Compliance Review Audit Report

## 1. Metadata
- **Review ID:** ${run.id}
- **Timestamp (UTC):** ${date}
- **File Name:** ${run.metadata.fileName}
- **File Size:** ${(run.metadata.fileSize / 1024).toFixed(1)} KB
- **Artifact Type:** ${run.metadata.artifactType}
- **Standards:** ${run.standards.join(', ') || 'ISO 13485'}
- **Inference Model:** ${run.provider.toUpperCase()} (${run.model})
- **Duration:** ${run.durationSeconds ? `${run.durationSeconds.toFixed(1)}s` : 'N/A'}

## 2. Executive Summary & AI Findings
${run.reviewMarkdown || 'No findings recorded.'}

## 3. Structured Compliance Findings (${run.comments.length} items)
${
  run.comments.length === 0
    ? '_No specific non-conformances identified._'
    : run.comments
        .map(
          (c, idx) =>
            `### ${idx + 1}. [${c.severity.toUpperCase()}] ${c.title}\n- **Section:** ${c.section}\n- **Standard:** ${c.standard}\n- **Details:** ${c.details}`,
        )
        .join('\n\n')
}

## 4. Remediation Recommendations (${run.recommendations.length} items)
${
  run.recommendations.length === 0
    ? '_No remediation items generated._'
    : run.recommendations
        .map(
          (r, idx) =>
            `### ${idx + 1}. [${r.severity.toUpperCase()}] ${r.title}\n${r.description}${
              r.relatedArtifacts.length ? `\n- **Referenced Artifacts:** ${r.relatedArtifacts.join(', ')}` : ''
            }`,
        )
        .join('\n\n')
}

## 5. Suggested Revised Document Text
\`\`\`markdown
${run.revisedText || 'No revision generated.'}
\`\`\`

## 6. Audit Trail Logs (${logs.length} entries)
| Timestamp | Level | Message |
| --- | --- | --- |
${
  logs.length === 0
    ? '| N/A | INFO | No audit logs available |'
    : logs
        .map(
          (l) =>
            `| ${new Date(l.timestamp).toISOString()} | ${l.level.toUpperCase()} | ${l.message.replace(/\|/g, '\\|')} |`,
        )
        .join('\n')
}
`;
};

