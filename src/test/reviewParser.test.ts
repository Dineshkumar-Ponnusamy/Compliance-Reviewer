import { describe, it, expect } from 'vitest';
import { parseReviewMarkdown } from '../utils/reviewParser';

describe('reviewParser', () => {
  it('parses markdown headings and bullet points into comments and recommendations', () => {
    const markdown = `
## Missing Requirements or Traceability Gaps
- The software requirements document lacks traceability to system hazards (ISO 13485:2016 clause 4.1) #REQ-101
- Risk control measures are not traceable to specific software requirements (IEC 62304 clause 5.2)

## Ambiguous or Weak Language
- "The system shall perform adequately" is too vague (ISO 13485 clause 7.1)

## Recommended Actions
- Add traceability matrix linking all software requirements to hazard analysis (ISO 13485:2016 clause 4.1)
- Implement automated testing for all risk control measures (IEC 62304 clause 6.2)
    `;

    const result = parseReviewMarkdown(markdown);
    expect(result.comments.length).toBe(3);
    expect(result.recommendations.length).toBe(2);

    const criticalComment = result.comments.find(c => c.section.includes('Missing Requirements'));
    expect(criticalComment?.severity).toBe('critical');

    const vagueComment = result.comments.find(c => c.summary.includes('adequately'));
    expect(vagueComment?.severity).toBe('high');

    const firstRec = result.recommendations[0];
    expect(firstRec.title).toContain('Add traceability matrix');
    expect(firstRec.autoDraftAvailable).toBe(true);
    expect(firstRec.relatedArtifacts).toContain('ISO 13485:2016');
  });

  it('parses markdown table rows into findings and recommendations', () => {
    const tableMarkdown = `
## 1. Compliance Findings
| Area | Finding | Impact/Risk | Recommended Action |
| --- | --- | --- | --- |
| Traceability | No link between FR-3.2 and hazard analysis | High risk of missed clinical hazard | Implement bidirectional traceability in matrix |
| Data Integrity | Missing checksum validation on upload | Potential silent data corruption | Add SHA-256 validation to BLE transfer #VR-7.5 |
    `;

    const result = parseReviewMarkdown(tableMarkdown);
    expect(result.comments.length).toBe(2);
    expect(result.recommendations.length).toBe(2);
    expect(result.comments[0].summary).toContain('Finding: No link between FR-3.2');
    expect(result.recommendations[0].title).toContain('Implement bidirectional traceability');
  });

  it('gracefully handles empty or nonsense input', () => {
    expect(parseReviewMarkdown('')).toEqual({ comments: [], recommendations: [] });
    expect(parseReviewMarkdown('   ')).toEqual({ comments: [], recommendations: [] });
    
    const nonsense = `
      ----------
      🟡 low
      inspect
      collapse
    `;
    const result = parseReviewMarkdown(nonsense);
    expect(result.comments.length).toBe(0);
  });
});
