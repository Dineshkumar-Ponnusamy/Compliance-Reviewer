import React, { useCallback, useRef, useState } from 'react';
import clsx from 'classnames';
import { DocumentMetadata } from '../types';

interface DocumentUploaderProps {
  onDocumentParsed: (text: string, metadata: DocumentMetadata) => void;
  isLoading: boolean;
  metadata: DocumentMetadata | null;
  onError: (message: string) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentParsed, isLoading, metadata, onError }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);

  const resetProgress = () => {
    setTimeout(() => setProgress(0), 600);
  };

  const extractTextFromFile = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read the uploaded file.'));
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 80));
        }
      };
      reader.onload = () => {
        setProgress(100);
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Unsupported file encoding.'));
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      try {
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
        resetProgress();
      } catch (error: any) {
        onError(error?.message ?? 'Unable to process the document.');
        setProgress(0);
      }
    },
    [metadata, onDocumentParsed, onError],
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
          accept=".pdf,.doc,.docx,.txt,.xlsx"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
            ⬆︎
          </span>
          <p className="text-sm font-medium text-gray-200">Drag & drop to upload</p>
          <p className="text-xs text-gray-400">PDF, DOCX, XLSX, TXT · 50MB max</p>
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
