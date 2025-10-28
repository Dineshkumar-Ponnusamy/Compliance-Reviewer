import { Recommendation, ReviewComment, ReviewArtifactRequest } from '../types';

const SECTION_SEVERITY: Record<string, Recommendation['severity']> = {
  'Missing Requirements or Traceability Gaps': 'critical',
  'Ambiguous or Weak Language': 'high',
  'Risk Assessment Findings': 'high',
  'Recommended Actions': 'low',
};

export function parseReviewMarkdown(
  markdown: string,
  context?: ReviewArtifactRequest,
): { comments: ReviewComment[]; recommendations: Recommendation[] } {
  const comments: ReviewComment[] = [];
  const recommendations: Recommendation[] = [];
  if (!markdown.trim()) {
    return { comments, recommendations };
  }

  const lines = markdown.replace(/<br\s*\/?>/gi, '\n').split('\n');
  let section = '';
  const now = new Date().toISOString();
  let recommendationCounter = 1;
  let commentCounter = 1;
  const defaultStandard = context?.standards?.[0] ?? 'ISO 13485';

  const pushComment = (line: string, severity: ReviewComment['severity']) => {
    if (!line.trim()) return;
    const title = line.length > 72 ? `${line.slice(0, 69)}…` : line;
    comments.push({
      id: `auto-comment-${commentCounter++}`,
      severity,
      section: section || 'General',
      title,
      summary: line,
      details: line,
      standard: defaultStandard,
      lastUpdated: now,
    });
  };

  const pushRecommendation = (line: string, severity: Recommendation['severity']) => {
    if (!line.trim()) return;
    recommendations.push({
      id: `auto-rec-${recommendationCounter++}`,
      title: line.length > 72 ? `${line.slice(0, 69)}…` : line,
      description: line,
      severity,
      relatedArtifacts: [],
      autoDraftAvailable: false,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.length) continue;

    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '');
      section = heading;
      continue;
    }

    const severity = SECTION_SEVERITY[section] ?? 'low';

    if (line.startsWith('|') && line.includes('|')) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length);

      if (cells.length >= 2) {
        const normalized = cells.map((cell) => cell.replace(/\*\*/g, '').toLowerCase());
        const looksLikeHeader =
          normalized.some((cell) => cell.includes('area')) &&
          normalized.some((cell) => cell.includes('recommended action'));
        if (looksLikeHeader) {
          continue;
        }

        const [areaCell = '', findingCell = '', impactCell = '', ...rest] = cells;
        const recommendationCell = rest.join(' | ');
        const summaryParts: string[] = [];
        if (findingCell) summaryParts.push(`Finding: ${findingCell}`);
        if (impactCell) summaryParts.push(`Impact/Risk: ${impactCell}`);
        const summary = summaryParts.join(' · ') || recommendationCell || findingCell || areaCell;
        const decoratedSummary = areaCell ? `[${areaCell}] ${summary}` : summary;
        pushComment(decoratedSummary, severity);
        if (recommendationCell) {
          pushRecommendation(recommendationCell, SECTION_SEVERITY[section] ?? severity);
        }
        continue;
      }
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      const cleaned = line.replace(/^[-•]\s*/, '').trim();
      const shouldTreatAsRecommendation =
        /recommend(ed|ations?)/i.test(section) ||
        /action/i.test(section) ||
        cleaned.toLowerCase().startsWith('add ') ||
        cleaned.toLowerCase().startsWith('implement ') ||
        cleaned.toLowerCase().startsWith('update ');
      if (shouldTreatAsRecommendation) {
        pushRecommendation(cleaned, SECTION_SEVERITY[section] ?? 'high');
      } else {
        pushComment(cleaned, severity);
      }
      continue;
    }

    const orderedMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      pushRecommendation(orderedMatch[2].trim(), SECTION_SEVERITY[section] ?? 'high');
      continue;
    }

    if (line.length) {
      pushComment(line, severity);
    }
  }

  return { comments, recommendations };
}
