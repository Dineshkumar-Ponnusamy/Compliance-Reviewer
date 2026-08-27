import React, { useCallback, useMemo, useRef, useState } from 'react';
import clsx from 'classnames';
import { DocumentMetadata } from '../types';
import { cleanPdfText, cleanDocxText, cleanXlsxText } from '../utils/textCleaner';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

interface DocumentUploaderProps {
  onDocumentParsed: (text: string, metadata: DocumentMetadata) => void;
  isLoading: boolean;
  metadata: DocumentMetadata | null;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json']);
const STRUCTURED_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'xls']);

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentParsed, isLoading, metadata, onError }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const supportedMimePrefixes = useMemo(() => ['text/', 'application/json'], []);

  const updateProgress = useCallback((value: number) => {
    setProgress((current) => {
      if (Number.isNaN(value)) return current;
      const clamped = Math.min(100, Math.max(0, value));
      return clamped < current ? current : clamped;
    });
  }, []);

  const readFileAsText = useCallback(
    (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read the uploaded file.'));
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            updateProgress(Math.round((event.loaded / event.total) * 80));
          }
        };
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Unsupported file encoding.'));
          }
        };
        reader.readAsText(file);
      }),
    [updateProgress],
  );

  const readFileAsArrayBuffer = useCallback(
    (file: File) =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read the uploaded file.'));
        reader.onprogress = (event) => {
          if (event.lengthComputable) {
            updateProgress(Math.round((event.loaded / event.total) * 60));
          }
        };
        reader.onload = () => {
          const result = reader.result;
          if (result instanceof ArrayBuffer) {
            resolve(result);
          } else {
            reject(new Error('Unable to process binary file.'));
          }
        };
        reader.readAsArrayBuffer(file);
      }),
    [updateProgress],
  );

  const extractPdfText = useCallback(
    async (file: File) => {
      // Lazy load PDF.js only when needed
      const [pdfjsModule, data] = await Promise.all([
        import('pdfjs-dist'),
        readFileAsArrayBuffer(file),
      ]);
      const pdfjs: any = (pdfjsModule as any).default ?? pdfjsModule;

      // Use local bundled worker to support offline and air-gapped deployments
      if (pdfjs.GlobalWorkerOptions.workerSrc !== pdfWorker) {
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
      }

      const pdf = await pdfjs.getDocument({ data }).promise;
      let combined = '';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
        combined += `${pageText.trim()}\n\n`;
        updateProgress(60 + Math.round((pageNumber / pdf.numPages) * 30));
      }
      const rawText = combined.trim();
      const { cleanedText } = cleanPdfText(rawText);
      return cleanedText;
    },
    [readFileAsArrayBuffer, updateProgress],
  );

  const extractDocxText = useCallback(
    async (file: File) => {
      // Lazy load mammoth only when needed
      const [mammoth, arrayBuffer] = await Promise.all([
        import('mammoth/mammoth.browser'),
        readFileAsArrayBuffer(file),
      ]);
      const result = await mammoth.extractRawText({ arrayBuffer });
      updateProgress(90);
      const rawText = result.value.trim();
      const { cleanedText } = cleanDocxText(rawText);
      return cleanedText;
    },
    [readFileAsArrayBuffer, updateProgress],
  );

  const extractXlsxText = useCallback(
    async (file: File) => {
      // Lazy load xlsx only when needed
      const [module, arrayBuffer] = await Promise.all([import('xlsx'), readFileAsArrayBuffer(file)]);
      const xlsx = module.default ?? module;
      const workbook = xlsx.read(arrayBuffer, { type: 'array' });
      const sheets = workbook.SheetNames.map((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return '';
        const csv = xlsx.utils.sheet_to_csv(sheet, { blankrows: false }).trim();
        return csv.length ? `# Sheet: ${sheetName}\n${csv}` : '';
      }).filter(Boolean);
      updateProgress(90);
      const rawText = sheets.join('\n\n').trim();
      const { cleanedText } = cleanXlsxText(rawText);
      return cleanedText;
    },
    [readFileAsArrayBuffer, updateProgress],
  );

  const extractTextFromFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds the 10MB limit. Split the document or compress before uploading.');
      }

      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const isPlainText =
        TEXT_EXTENSIONS.has(extension) ||
        (Boolean(file.type) && supportedMimePrefixes.some((prefix) => file.type.startsWith(prefix)));

      if (isPlainText) {
        return readFileAsText(file);
      }

      if (!STRUCTURED_EXTENSIONS.has(extension)) {
        throw new Error('Unsupported file type. Upload TXT, Markdown, JSON, PDF, DOCX, or XLSX files.');
      }

      if (extension === 'pdf') {
        return extractPdfText(file);
      }

      if (extension === 'docx') {
        return extractDocxText(file);
      }

      if (extension === 'xlsx' || extension === 'xls') {
        return extractXlsxText(file);
      }

      throw new Error('Unsupported file type. Upload TXT, Markdown, JSON, PDF, DOCX, or XLSX files.');
    },
    [extractDocxText, extractPdfText, extractXlsxText, readFileAsText, supportedMimePrefixes],
  );

  const resetProgress = () => {
    setTimeout(() => setProgress(0), 600);
  };

  const handleFile = useCallback(
    async (file: File) => {
      try {
        updateProgress(5);
        setFileName(file.name);
        const text = await extractTextFromFile(file);
        const metadataPayload: DocumentMetadata = {
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          artifactType: metadata?.artifactType ?? 'requirements',
          standards: metadata?.standards ?? [],
        };
        onDocumentParsed(text, metadataPayload);
        updateProgress(100);
        resetProgress();
      } catch (error: any) {
        onError(error?.message ?? 'Unable to process the document.');
        setProgress(0);
      }
    },
    [extractTextFromFile, metadata, onDocumentParsed, onError, updateProgress],
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-800/70 p-6 shadow-lg shadow-black/20">
      <div
        className={clsx(
          'relative flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition',
          dragActive ? 'border-cyan-500/80 bg-cyan-500/10' : 'border-gray-600 bg-gray-800',
          isLoading && 'opacity-50',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.json,.pdf,.docx,.xlsx,.xls"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
            ⬆︎
          </span>
          <p className="text-sm font-medium text-gray-200">Drag & drop to upload</p>
          <p className="text-xs text-gray-400">TXT, MD, JSON, PDF, DOCX, XLS(X) · 10MB max</p>
        </div>
        {progress > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-right text-gray-400">{progress}%</p>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2 text-xs text-gray-400">
        <p>
          Last uploaded:{' '}
          <span className="font-medium text-gray-200">
            {fileName ?? metadata?.fileName ?? 'Awaiting document'}
          </span>
        </p>
        {metadata && (
          <p>
            Size: {(metadata.fileSize / 1024).toFixed(1)} KB · Uploaded {new Date(metadata.uploadedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default DocumentUploader;
