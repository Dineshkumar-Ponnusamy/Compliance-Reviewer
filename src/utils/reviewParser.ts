import { Recommendation, ReviewComment, ReviewArtifactRequest, SeverityLevel } from '../types';

function matchSectionSeverity(section: string): SeverityLevel {
  const normalized = section.toLowerCase();
  if (normalized.includes('missing') || normalized.includes('gap') || normalized.includes('critical') || normalized.includes('hazard')) {
    return 'critical';
  }
  if (normalized.includes('risk') || normalized.includes('ambiguous') || normalized.includes('weak') || normalized.includes('high')) {
    return 'high';
  }
  if (normalized.includes('recommend') || normalized.includes('action') || normalized.includes('low') || normalized.includes('improvement')) {
    return 'low';
  }
  return 'high';
}

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
    /^compliance review\s*findings?:?$/i,
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

function extractRelatedArtifacts(text: string): string[] {
  const matches = text.match(/(#?[A-Z]{2,}-\d+(\.\d+)*|(ISO|IEC|EU MDR|FDA)\s+[\d:.-]+)/gi);
  if (!matches) return [];
  return Array.from(new Set(matches.map(m => m.replace(/^#/, '')))).slice(0, 5);
}

export function parseReviewMarkdown(
  markdown: string,
  context?: ReviewArtifactRequest,
): { comments: ReviewComment[]; recommendations: Recommendation[] } {
  const comments: ReviewComment[] = [];
  const recommendations: Recommendation[] = [];
  if (!markdown || !markdown.trim()) {
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
    const cleaned = line.trim();
    if (!cleaned) return;

    if (isNonsenseContent(cleaned)) {
      return;
    }

    const title = cleaned.length > 72 ? `${cleaned.slice(0, 69)}…` : cleaned;
    comments.push({
      id: `auto-comment-${commentCounter++}`,
      severity,
      section: section || 'General Compliance',
      title,
      summary: cleaned,
      details: cleaned,
      standard: defaultStandard,
      lastUpdated: now,
    });
  };

  const pushRecommendation = (line: string, severity: Recommendation['severity']) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    const related = extractRelatedArtifacts(cleaned);
    recommendations.push({
      id: `auto-rec-${recommendationCounter++}`,
      title: cleaned.length > 72 ? `${cleaned.slice(0, 69)}…` : cleaned,
      description: cleaned,
      severity,
      relatedArtifacts: related,
      autoDraftAvailable: true,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.length) continue;

    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      section = heading;
      continue;
    }

    const severity = matchSectionSeverity(section);

    if (line.startsWith('|') && line.includes('|')) {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length);

      if (cells.length >= 2) {
        // Skip table separator row like | --- | --- |
        if (cells.every((cell) => new RegExp('^[\\-:\\s]+$').test(cell))) {
          continue;
        }

        const normalized = cells.map((cell) => cell.replace(/\*\*/g, '').toLowerCase());
        const looksLikeHeader =
          normalized.some((cell) => cell.includes('area') || cell.includes('finding') || cell.includes('clause')) &&
          normalized.some((cell) => cell.includes('action') || cell.includes('impact') || cell.includes('severity'));
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
          pushRecommendation(recommendationCell, matchSectionSeverity(section));
        }
        continue;
      }
    }

    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
      const cleaned = line.replace(/^[-•*]\s*/, '').trim();
      const isRecSection = /recommend(ed|ations?)/i.test(section) || /action/i.test(section);
      const isActionVerb = /^(add |implement |update |create |define |ensure |incorporate |revise )/i.test(cleaned);

      if (isRecSection || (isActionVerb && !section.toLowerCase().includes('missing'))) {
        pushRecommendation(cleaned, isRecSection ? 'low' : severity);
      } else {
        pushComment(cleaned, severity);
      }
      continue;
    }

    const orderedMatch = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[2].trim();
      if (/recommend(ed|ations?)/i.test(section) || /action/i.test(section)) {
        pushRecommendation(itemText, 'low');
      } else {
        pushComment(itemText, severity);
      }
      continue;
    }

    if (line.length) {
      pushComment(line, severity);
    }
  }

  // Filter out only the most egregious nonsense comments
  const meaningfulComments = comments.filter(comment =>
    comment.title.length > 5 &&
    !comment.title.includes('[Category]') &&
    !/^----------+/.test(comment.title)
  );

  const finalComments = meaningfulComments.length > 0 ? meaningfulComments :
    comments.slice(0, Math.min(5, comments.length));

  return { comments: finalComments, recommendations };
}
