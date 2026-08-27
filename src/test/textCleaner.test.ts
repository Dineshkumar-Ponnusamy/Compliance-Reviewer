import { describe, it, expect } from 'vitest';
import { cleanExtractedText, cleanPdfText, cleanDocxText, cleanXlsxText } from '../utils/textCleaner';

describe('textCleaner', () => {
  it('cleans empty lines and normalizes whitespace', () => {
    const raw = `
      Header section   with    extra    spaces   
      
      
      Line 1 content
      
      Line 2 content
    `;
    const result = cleanExtractedText(raw);
    expect(result.cleanedText).toContain('Header section with extra spaces');
    expect(result.cleanedText).toContain('Line 1 content\nLine 2 content');
    expect(result.linesRemoved).toBeGreaterThan(0);
  });

  it('removes page numbers and confidential markers but preserves document control', () => {
    const raw = `
Document Number: DOC-10492
Revision History: v1.2 Approved by Quality Lead
CONFIDENTIAL
Page 1 of 12
Functional requirement: The device shall monitor ECG.
- 1 -
Draft
Prepared by: Regulatory Team
    `;
    const result = cleanExtractedText(raw);
    expect(result.cleanedText).toContain('Document Number: DOC-10492');
    expect(result.cleanedText).toContain('Revision History: v1.2 Approved by Quality Lead');
    expect(result.cleanedText).toContain('Prepared by: Regulatory Team');
    expect(result.cleanedText).not.toContain('CONFIDENTIAL');
    expect(result.cleanedText).not.toContain('Page 1 of 12');
    expect(result.cleanedText).not.toContain('- 1 -');
    expect(result.cleanedText).not.toContain('Draft');
  });

  it('cleans PDF artifacts', () => {
    const raw = `
Page 2 of 10
\f
Device SRS Specification
12
Continued
Functional requirement text here.
    `;
    const result = cleanPdfText(raw);
    expect(result.cleanedText).toContain('Device SRS Specification');
    expect(result.cleanedText).toContain('Functional requirement text here.');
    expect(result.cleanedText).not.toContain('\f');
  });

  it('cleans DOCX artifacts', () => {
    const raw = `
+-------------------+
| Table Header      |
+-------------------+
Footnote reference [1] and content.
    `;
    const result = cleanDocxText(raw);
    expect(result.cleanedText).toContain('Table Header');
    expect(result.cleanedText).toContain('Footnote reference and content.');
  });

  it('cleans XLSX artifacts', () => {
    const raw = `
Sheet1:
Requirement ID,Title,Severity
,,
REQ-01,Alarm Notification,High
,,,,
    `;
    const result = cleanXlsxText(raw);
    expect(result.cleanedText).toContain('Requirement ID,Title,Severity');
    expect(result.cleanedText).toContain('REQ-01,Alarm Notification,High');
    expect(result.cleanedText).not.toContain(',,,,');
  });
});
