export interface TextCleaningOptions {
  minLineLength: number;
  removePageNumbers: boolean;
  removeHeadersFooters: boolean;
  preserveDocumentControl: boolean;
  normalizeSpacing: boolean;
  removeEmptyLines: boolean;
}

export interface CleaningResult {
  originalLength: number;
  cleanedLength: number;
  linesRemoved: number;
  charactersRemoved: number;
  cleanedText: string;
}

const DEFAULT_OPTIONS: TextCleaningOptions = {
  minLineLength: 3,
  removePageNumbers: true,
  removeHeadersFooters: true,
  preserveDocumentControl: true,
  normalizeSpacing: true,
  removeEmptyLines: true,
};

/**
 * Cleans extracted text from documents by removing artifacts, empty lines,
 * and normalizing formatting for better AI processing while preserving
 * vital regulatory document control metadata.
 */
export function cleanExtractedText(text: string, options: Partial<TextCleaningOptions> = {}): CleaningResult {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const originalLength = text.length;

  let lines = text.split('\n');
  const originalLineCount = lines.length;

  // Apply cleaning filters
  lines = lines
    .map(line => config.normalizeSpacing ? normalizeSpacing(line) : line)
    .filter(line => {
      // Remove empty lines and whitespace-only lines
      if (config.removeEmptyLines && !line.trim()) return false;

      // Remove lines that are too short (likely headers/footers/artifacts)
      if (line.trim().length < config.minLineLength) return false;

      // Remove lines with only punctuation/symbols
      if (/^[^\w\s]*$/.test(line.trim())) return false;

      // Remove page break artifacts
      if (line.includes('\f') || line.includes('\u000C')) return false;

      // Remove page numbers (common patterns)
      if (config.removePageNumbers && isPageNumberLine(line)) return false;

      // Remove common non-regulatory header/footer patterns
      if (config.removeHeadersFooters && isHeaderFooterLine(line, config.preserveDocumentControl)) return false;

      return true;
    });

  const cleanedText = lines.join('\n').trim();
  const cleanedLength = cleanedText.length;
  const linesRemoved = originalLineCount - lines.length;
  const charactersRemoved = originalLength - cleanedLength;

  return {
    originalLength,
    cleanedLength,
    linesRemoved,
    charactersRemoved,
    cleanedText,
  };
}

/**
 * Normalizes spacing in a line by converting multiple spaces/tabs to single spaces
 */
function normalizeSpacing(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if a line appears to be a page number
 */
function isPageNumberLine(line: string): boolean {
  const trimmed = line.trim();

  // Common page number patterns
  const pagePatterns = [
    /^page\s+\d+(\s+(of|\/)\s+\d+)?$/i,
    /^\d+\s+(of|\/)\s+\d+$/i,
    /^-\s*\d+\s*-$/,
    /^\d+$/, // Just a number (if it's very short, likely a page number)
  ];

  return pagePatterns.some(pattern => pattern.test(trimmed)) && trimmed.length < 20;
}

/**
 * Checks if a line appears to be an unneeded header or footer.
 * If preserveDocumentControl is true, critical regulatory audit lines
 * (e.g. Revision History, Document Control, Approvals) are preserved.
 */
function isHeaderFooterLine(line: string, preserveDocumentControl = true): boolean {
  const trimmed = line.trim();

  // Generic noise patterns that should always be removed
  const genericNoisePatterns = [
    /^confidential$/i,
    /^draft$/i,
    /^internal use only$/i,
    /^company confidential$/i,
    /^strictly confidential$/i,
    /^do not distribute$/i,
  ];

  if (genericNoisePatterns.some(pattern => pattern.test(trimmed))) {
    return true;
  }

  if (preserveDocumentControl) {
    return false;
  }

  // Purely structural headers that might be removed only if explicitly requested
  const documentControlPatterns = [
    /^document control/i,
    /^revision history/i,
    /^table of contents/i,
    /^prepared by/i,
    /^approved by/i,
    /^document number/i,
    /^effective date/i,
  ];

  return documentControlPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Advanced cleaning specifically for PDF-extracted text
 */
export function cleanPdfText(text: string): CleaningResult {
  // PDF-specific cleaning before general cleaning
  const cleaned = text
    // Remove form feed characters
    .replace(/\f/g, '')
    // Remove excessive line breaks (more than 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Remove lines that are just numbers (page numbers)
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove common PDF artifacts
    .replace(/^\s*continued\s*$/gmi, '');

  return cleanExtractedText(cleaned, {
    minLineLength: 5, // PDFs often have shorter meaningful lines
    removePageNumbers: true,
    removeHeadersFooters: true,
  });
}

/**
 * Advanced cleaning specifically for DOCX-extracted text
 */
export function cleanDocxText(text: string): CleaningResult {
  // DOCX-specific cleaning
  const cleaned = text
    // Remove table artifacts (lines that look like table borders)
    .replace(/^[-+=|]+\s*$/gm, '')
    // Remove footnote markers
    .replace(/\[\d+\]/g, '')
    // Remove excessive spacing
    .replace(/\n{3,}/g, '\n\n');

  return cleanExtractedText(cleaned, {
    minLineLength: 3,
    removePageNumbers: true,
    removeHeadersFooters: true,
  });
}

/**
 * Advanced cleaning specifically for XLSX-extracted text
 */
export function cleanXlsxText(text: string): CleaningResult {
  // XLSX-specific cleaning
  const cleaned = text
    // Remove sheet headers that are just numbers
    .replace(/^Sheet\d*:?\s*$/gmi, '')
    // Remove empty CSV rows
    .replace(/^,+$/gm, '')
    // Clean up CSV artifacts
    .replace(/,,+/g, ',')
    .replace(/^,|,$/gm, '');

  return cleanExtractedText(cleaned, {
    minLineLength: 2, // Spreadsheet data can be very short
    removePageNumbers: false, // Less relevant for spreadsheets
    removeHeadersFooters: false,
  });
}
