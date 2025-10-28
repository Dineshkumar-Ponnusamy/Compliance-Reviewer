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

export const clearReviewData = async () => {
  if (!isBrowser) return;
  const db = await getDb();
  await Promise.all([db.clear(RUN_STORE), db.clear(LOG_STORE)]);
};
