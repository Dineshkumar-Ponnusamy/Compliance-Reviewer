import { Recommendation, ReviewComment, ReviewArtifactRequest } from '../types';

const SECTION_SEVERITY: Record<string, Recommendation['severity']> = {
  'Missing Requirements or Traceability Gaps': 'critical',
  'Ambiguous or Weak Language': 'high',
  'Risk Assessment Findings': 'high',
  'Recommended Actions': 'low',
};

/**
 * Determines if a line contains nonsense or meaningless content that should be filtered out
 */
function isNonsenseContent(line: string): boolean {
  const trimmed = line.trim();

  // Filter out emoji-only lines
  if (/^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(trimmed)) {
    return true;
  }

  // Filter out lines that are just symbols/repeated characters
  if (/^[-=|_*#+\s]{3,}$/.test(trimmed)) {
    return true;
  }

  // Filter out lines that are mostly placeholder dashes (10+ consecutive dashes)
  if (/----------{2,}/.test(trimmed)) {
    return true;
  }

  // Filter out generic headers and placeholders
  const nonsensePatterns = [
    /^step\s+\d+/i,
    /^compliance review/i,
    /^finding:\s*findings?$/i,
    /^\[.*?\]\s*finding:\s*\[.*?\]$/i,
    /^\[.*?\]\s*finding:\s*----------+$/i,
    /^\[----------+\]\s*finding:\s*----------+\s*·/i,
    /^inspect$/i,
    /^collapse$/i,
    /^standard\s*·/i,
    /^last updated\s*·/i,
    /^⬆︎\s*severity$/i,
    /^🕒\s*recent$/i,
    /^ai review comments$/i,
    /^gemini surfaces/i,
    /^🟢\s*(low|medium|high|critical)$/i,
    /^🔴\s*(low|medium|high|critical)$/i,
    /^🟡\s*(low|medium|high|critical)$/i,
    /^impact\/risk:\s*----------+$/i,
  ];

  return nonsensePatterns.some(pattern => pattern.test(trimmed));
}

export function parseReviewMarkdown(
  markdown: string,
  context?: ReviewArtifactRequest,
): { comments: ReviewComment[]; recommendations: Recommendation[] } {
  const comments: ReviewComment[] = [];
  const recommendations: Recommendation[] = [];
  if (!markdown.trim()) {
    return { comments, recommendations };
  }

  // Check if the entire response is just UI artifacts and nonsense
  const allLines = markdown.replace(/<br\s*\/?>/gi, '\n').split('\n');
  const meaningfulLines = allLines.filter(line => line.trim() && !isNonsenseContent(line.trim()));

  // If less than 5% of lines are meaningful, consider this a failed response
  if (meaningfulLines.length / allLines.length < 0.05 && allLines.length > 10) {
    console.warn('[reviewParser] AI response appears to contain mostly UI artifacts, returning empty results');
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

    // Filter out nonsense or meaningless content
    if (isNonsenseContent(line)) {
      console.log('[reviewParser] Filtered nonsense comment:', JSON.stringify(line));
      return;
    }

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

  // Filter out only the most egregious nonsense comments
  const meaningfulComments = comments.filter(comment =>
    comment.title.length > 5 && // Title must be at least somewhat substantial
    !comment.title.includes('[Category]') && // Avoid category placeholders
    !/^----------+/.test(comment.title) // Avoid dash-only titles
  );

  // If we filtered out too much, keep at least some comments
  const finalComments = meaningfulComments.length > 0 ? meaningfulComments :
    comments.slice(0, Math.min(5, comments.length)); // Keep up to 5 comments even if they're not great

  return { comments: finalComments, recommendations };
}
