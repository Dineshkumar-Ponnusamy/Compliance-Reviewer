export type SeverityLevel = 'critical' | 'high' | 'low';

export type ArtifactType = 'requirements' | 'tests' | 'defects' | 'traceability';

export type AIProvider = 'openai' | 'gemini' | 'azure' | 'groq' | 'ollama';

export type UserRole = 'admin' | 'reviewer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export type AppTab = 'dashboard' | 'reports' | 'settings' | 'help' | 'admin' | 'profile';

export interface ReviewComment {
  id: string;
  severity: SeverityLevel;
  section: string;
  title: string;
  summary: string;
  details: string;
  standard: string;
  lastUpdated: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  relatedArtifacts: string[];
  autoDraftAvailable: boolean;
}

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  artifactType: ArtifactType;
  standards: string[];
}

export interface AISettings {
  provider: AIProvider;
  mode: 'cloud' | 'local';
  model: string;
  apiKey: string;
  baseUrl?: string;
  lastUpdated?: string;
}

export interface ReviewHistoryItem {
  id: string;
  timestamp: string;
  metadata: DocumentMetadata;
  originalText: string;
  highlights: string;
  comments: ReviewComment[];
  recommendations: Recommendation[];
  reviewMarkdown: string;
  revisedText: string;
  provider: AIProvider;
  model: string;
  standards: string[];
  durationSeconds?: number;
}

export type ReviewLogLevel = 'info' | 'warn' | 'error';

export interface ReviewLogEntry {
  id: string;
  reviewId: string;
  timestamp: string;
  message: string;
  level: ReviewLogLevel;
}

export type ReviewStreamEvent =
  | { type: 'review'; chunk: string }
  | { type: 'revision'; text: string }
  | { type: 'structured'; comments: ReviewComment[]; recommendations: Recommendation[] };

export interface ReviewArtifactRequest {
  content: string;
  artifactType: ArtifactType;
  standards: string[];
  metadata?: Partial<DocumentMetadata>;
}
