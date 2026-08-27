import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveReviewRun,
  listReviewRuns,
  appendLogEntry,
  listLogsForReview,
  deleteReviewRun,
  clearReviewData,
  formatReviewAuditReport,
} from '../services/reviewStore';
import { ReviewHistoryItem, ReviewLogEntry } from '../types';

describe('reviewStore', () => {
  beforeEach(async () => {
    await clearReviewData();
  });

  it('saves and lists review runs sorted by descending timestamp', async () => {
    const run1: ReviewHistoryItem = {
      id: 'run-1',
      timestamp: '2026-08-20T10:00:00Z',
      metadata: {
        fileName: 'reqs-v1.txt',
        fileSize: 1024,
        uploadedAt: '2026-08-20T10:00:00Z',
        artifactType: 'requirements',
        standards: ['ISO 13485'],
      },
      originalText: 'Original 1',
      highlights: 'Highlights 1',
      comments: [],
      recommendations: [],
      reviewMarkdown: 'Markdown 1',
      revisedText: 'Revised 1',
      provider: 'openai',
      model: 'gpt-4o',
      standards: ['ISO 13485'],
    };

    const run2: ReviewHistoryItem = {
      ...run1,
      id: 'run-2',
      timestamp: '2026-08-21T12:00:00Z',
    };

    await saveReviewRun(run1);
    await saveReviewRun(run2);

    const runs = await listReviewRuns();
    expect(runs.length).toBe(2);
    expect(runs[0].id).toBe('run-2');
    expect(runs[1].id).toBe('run-1');
  });

  it('appends and lists log entries for a review', async () => {
    const log1: ReviewLogEntry = {
      id: 'log-1',
      reviewId: 'run-1',
      timestamp: '2026-08-20T10:00:01Z',
      message: 'Review started',
      level: 'info',
    };

    const log2: ReviewLogEntry = {
      id: 'log-2',
      reviewId: 'run-1',
      timestamp: '2026-08-20T10:00:05Z',
      message: 'Chunk 1 received',
      level: 'info',
    };

    await appendLogEntry(log1);
    await appendLogEntry(log2);

    const logs = await listLogsForReview('run-1');
    expect(logs.length).toBe(2);
    expect(logs[0].message).toBe('Review started');
    expect(logs[1].message).toBe('Chunk 1 received');
  });

  it('deletes review run and associated logs', async () => {
    const run: ReviewHistoryItem = {
      id: 'run-delete',
      timestamp: '2026-08-20T10:00:00Z',
      metadata: {
        fileName: 'doc.txt',
        fileSize: 500,
        uploadedAt: '2026-08-20T10:00:00Z',
        artifactType: 'defects',
        standards: ['IEC 62304'],
      },
      originalText: 'text',
      highlights: 'high',
      comments: [],
      recommendations: [],
      reviewMarkdown: 'md',
      revisedText: 'rev',
      provider: 'ollama',
      model: 'llama3',
      standards: ['IEC 62304'],
    };

    await saveReviewRun(run);
    await appendLogEntry({
      id: 'log-del',
      reviewId: 'run-delete',
      timestamp: '2026-08-20T10:00:01Z',
      message: 'test log',
      level: 'info',
    });

    await deleteReviewRun('run-delete');
    const runs = await listReviewRuns();
    expect(runs.find((r) => r.id === 'run-delete')).toBeUndefined();

    const logs = await listLogsForReview('run-delete');
    expect(logs.length).toBe(0);
  });

  it('formats comprehensive markdown audit report', () => {
    const run: ReviewHistoryItem = {
      id: 'audit-run',
      timestamp: '2026-08-26T20:00:00Z',
      metadata: {
        fileName: 'CardioWatch-SRS.pdf',
        fileSize: 20480,
        uploadedAt: '2026-08-26T20:00:00Z',
        artifactType: 'requirements',
        standards: ['ISO 13485', 'IEC 62304'],
      },
      originalText: 'Original SRS',
      highlights: 'Highlights',
      comments: [
        {
          id: 'c1',
          severity: 'critical',
          section: 'Traceability',
          title: 'Missing Hazard Link',
          summary: 'Missing Hazard Link',
          details: 'Clause 4.1 violated',
          standard: 'ISO 13485',
          lastUpdated: '2026-08-26T20:00:00Z',
        },
      ],
      recommendations: [
        {
          id: 'r1',
          severity: 'critical',
          title: 'Add Hazard Traceability Matrix',
          description: 'Link all requirements to hazard log',
          relatedArtifacts: ['ISO 13485:2016'],
          autoDraftAvailable: true,
        },
      ],
      reviewMarkdown: '## Review Findings\nAll good',
      revisedText: 'Revised SRS text',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      standards: ['ISO 13485', 'IEC 62304'],
      durationSeconds: 3.5,
    };

    const logs: ReviewLogEntry[] = [
      {
        id: 'l1',
        reviewId: 'audit-run',
        timestamp: '2026-08-26T20:00:01Z',
        message: 'Review completed',
        level: 'info',
      },
    ];

    const report = formatReviewAuditReport(run, logs);
    expect(report).toContain('# Compliance Review Audit Report');
    expect(report).toContain('CardioWatch-SRS.pdf');
    expect(report).toContain('Missing Hazard Link');
    expect(report).toContain('Add Hazard Traceability Matrix');
    expect(report).toContain('Review completed');
  });
});
