import { GoogleGenerativeAI } from '@google/generative-ai';
import { AISettings, ArtifactType, ReviewArtifactRequest, ReviewStreamEvent } from '../types';
import { parseReviewMarkdown } from '../utils/reviewParser';

const PROMPT_TEMPLATE = `You are a senior Quality & Regulatory Specialist for medical-device software.
Analyze the following {artifactType} for compliance with {standard}.
Step 1 – Provide a markdown-formatted review covering:
• Missing Requirements or Traceability Gaps
• Ambiguous or Weak Language
• Risk Assessment Findings
• Recommended Actions
Step 2 – Output the separator:
|||---REVISED_TEXT_SEPARATOR---|||
Step 3 – Provide the fully revised artifact text.`;

const SEPARATOR = '|||---REVISED_TEXT_SEPARATOR---|||';

type ReviewOptions = {
  signal?: AbortSignal;
};

const ARTIFACT_LABEL: Record<ArtifactType, string> = {
  requirements: 'requirements specification',
  tests: 'test or verification artifact',
  defects: 'defect log or CAPA artifact',
  traceability: 'traceability matrix/cross-reference artifact',
};

const requiresApiKey = (provider: AISettings['provider']) => provider !== 'ollama';

export async function* reviewArtifact(
  request: ReviewArtifactRequest,
  settings: AISettings,
  options: ReviewOptions = {},
): AsyncGenerator<ReviewStreamEvent> {
  if (!request.content.trim()) {
    throw new Error('Artifact content is empty.');
  }

  if (requiresApiKey(settings.provider) && !settings.apiKey.trim()) {
    throw new Error(`API key missing for ${settings.provider.toUpperCase()}.`);
  }

  try {
    switch (settings.provider) {
      case 'gemini':
        yield* runGeminiReview(request, settings, options);
        break;
      case 'ollama':
        yield* runOllamaReview(request, settings);
        break;
      default:
        yield* runOpenAICompatibleReview(request, settings);
        break;
    }
  } catch (error: any) {
    console.error('[aiReview] Review invocation failed', error);
    const err = error instanceof Error ? error : new Error('Unable to generate AI review.');
    err.message =
      settings.provider === 'ollama'
        ? `Ollama request failed. Ensure the host allows CORS from this origin. Details: ${err.message}`
        : err.message;
    throw err;
  }
}

export const reviewDocument = reviewArtifact;

export async function testConnection(settings: AISettings) {
  if (requiresApiKey(settings.provider) && !settings.apiKey.trim()) {
    return { ok: false, message: 'Provide an API key before testing the connection.' };
  }

  try {
    switch (settings.provider) {
      case 'gemini': {
        const client = new GoogleGenerativeAI(settings.apiKey);
        const model = client.getGenerativeModel({ model: settings.model });
        await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Ping for connectivity check.' }]}],
          generationConfig: { temperature: 0 },
        });
        return { ok: true, message: 'Gemini endpoint is reachable.' };
      }
      case 'ollama': {
        const baseUrl = normalizeBaseUrl(settings.baseUrl);
        if (!baseUrl) {
          return { ok: false, message: 'Provide an Ollama host URL to test connectivity.' };
        }
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
          throw new Error(`Ollama responded with ${response.status}`);
        }
        return { ok: true, message: 'Ollama host responded successfully.' };
      }
      default: {
        const endpoint = getOpenAICompatibleEndpoint(settings);
        if (!endpoint) {
          return { ok: false, message: 'Configure a valid endpoint URL before testing.' };
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (settings.provider === 'azure') {
          headers['api-key'] = settings.apiKey.trim();
        } else {
          headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
        }

        const body = JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: 'Ping response' }],
          max_tokens: 32,
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body,
        });

        if (!response.ok) {
          throw new Error(`Provider responded with ${response.status}`);
        }

        return { ok: true, message: 'Provider responded successfully.' };
      }
    }
  } catch (error: any) {
    console.error('[aiReview] testConnection error', error);
    return { ok: false, message: error?.message ?? 'Failed to reach the AI endpoint.' };
  }
}

async function* runGeminiReview(
  request: ReviewArtifactRequest,
  settings: AISettings,
  options: ReviewOptions,
): AsyncGenerator<ReviewStreamEvent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true });

  try {
    const client = new GoogleGenerativeAI(settings.apiKey.trim());
    const model = client.getGenerativeModel({ model: settings.model });
    const prompt = buildPrompt(request);

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.2 },
    });

    let reviewBuffer = '';
    let revisionBuffer = '';
    let hasSeenSeparator = false;

    for await (const event of result.stream) {
      const text = event.text();
      if (!text) continue;

      if (!hasSeenSeparator) {
        const combined = reviewBuffer + text;
        const separatorIndex = combined.indexOf(SEPARATOR);

        if (separatorIndex >= 0) {
          const reviewPart = combined.slice(0, separatorIndex);
          const postSeparator = combined.slice(separatorIndex + SEPARATOR.length);

          if (reviewPart.length) {
            yield { type: 'review', chunk: reviewPart };
          }

          hasSeenSeparator = true;

          if (postSeparator.trim().length) {
            revisionBuffer += postSeparator;
            yield { type: 'revision', text: revisionBuffer };
          }
        } else {
          reviewBuffer = combined;
          yield { type: 'review', chunk: text };
        }
      } else {
        revisionBuffer += text;
        yield { type: 'revision', text: revisionBuffer };
      }
    }

    if (!hasSeenSeparator && reviewBuffer.length) {
      yield { type: 'review', chunk: reviewBuffer };
    }

    const structured = parseReviewMarkdown(reviewBuffer, request);
    if (structured.comments.length || structured.recommendations.length) {
      yield { type: 'structured', comments: structured.comments, recommendations: structured.recommendations };
    }

    if (hasSeenSeparator && revisionBuffer.length === 0) {
      yield { type: 'revision', text: '' };
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function* runOpenAICompatibleReview(
  request: ReviewArtifactRequest,
  settings: AISettings,
): AsyncGenerator<ReviewStreamEvent> {
  const endpoint = getOpenAICompatibleEndpoint(settings);
  if (!endpoint) {
    throw new Error('No endpoint configured for the selected provider.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (settings.provider === 'azure') {
    headers['api-key'] = settings.apiKey.trim();
  } else {
    headers.Authorization = `Bearer ${settings.apiKey.trim()}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: 'You are a medical-device compliance co-pilot.' },
        { role: 'user', content: buildPrompt(request) },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider responded with status ${response.status}`);
  }

  const data = await response.json();
  const content: string =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.choices?.[0]?.message?.content)
      ? data.choices[0].message.content.map((part: any) => part.text ?? part).join('')
      : '');

  if (!content.trim()) {
    throw new Error('Provider returned an empty response.');
  }

  yield* emitFromCompleteContent(content, request);
}

async function* runOllamaReview(
  request: ReviewArtifactRequest,
  settings: AISettings,
): AsyncGenerator<ReviewStreamEvent> {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (!baseUrl) {
    throw new Error('Ollama base URL missing.');
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    mode: 'cors',
    body: JSON.stringify({
      model: settings.model,
      prompt: buildPrompt(request),
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama responded with status ${response.status}`);
  }

  const data = await response.json();
  const content = data?.response ?? '';

  if (!content.trim()) {
    throw new Error('Ollama returned an empty response.');
  }

  yield* emitFromCompleteContent(content, request);
}

async function* emitFromCompleteContent(
  content: string,
  request: ReviewArtifactRequest,
): AsyncGenerator<ReviewStreamEvent> {
  const separatorIndex = content.indexOf(SEPARATOR);

  if (separatorIndex === -1) {
    yield { type: 'review', chunk: content };
    const structured = parseReviewMarkdown(content, request);
    if (structured.comments.length || structured.recommendations.length) {
      yield { type: 'structured', comments: structured.comments, recommendations: structured.recommendations };
    }
    return;
  }

  const reviewPart = content.slice(0, separatorIndex);
  const revisionPart = content.slice(separatorIndex + SEPARATOR.length);

  if (reviewPart.trim()) {
    yield { type: 'review', chunk: reviewPart };
    const structured = parseReviewMarkdown(reviewPart, request);
    if (structured.comments.length || structured.recommendations.length) {
      yield { type: 'structured', comments: structured.comments, recommendations: structured.recommendations };
    }
  }

  yield { type: 'revision', text: revisionPart.trimStart() };
}

function buildPrompt(request: ReviewArtifactRequest) {
  const standardsList = request.standards.length ? request.standards.join(', ') : 'ISO 13485';
  const artifactLabel = ARTIFACT_LABEL[request.artifactType] ?? 'artifact';
  const metadataBlock = formatMetadata(request.metadata);
  return (
    PROMPT_TEMPLATE.replace('{standard}', standardsList).replace('{artifactType}', artifactLabel) +
    `\n${metadataBlock}${request.content}\n`
  );
}

function formatMetadata(metadata?: Partial<ReviewArtifactRequest['metadata']>) {
  if (!metadata) return '<<ARTIFACT_CONTENT>>\n';
  const lines: string[] = ['<<ARTIFACT_METADATA>>'];
  if (metadata.fileName) lines.push(`File Name: ${metadata.fileName}`);
  if (metadata.fileSize) lines.push(`File Size: ${metadata.fileSize} bytes`);
  if (metadata.uploadedAt) lines.push(`Uploaded: ${metadata.uploadedAt}`);
  if (metadata.artifactType) lines.push(`Artifact Type: ${metadata.artifactType}`);
  if (metadata.standards && metadata.standards.length) {
    lines.push(`Declared Standards: ${metadata.standards.join(', ')}`);
  }
  lines.push('<<ARTIFACT_CONTENT>>');
  return `${lines.join('\n')}\n`;
}

function normalizeBaseUrl(url?: string) {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function getOpenAICompatibleEndpoint(settings: AISettings) {
  if (settings.provider === 'openai') {
    return 'https://api.openai.com/v1/chat/completions';
  }

  if (settings.provider === 'groq') {
    return settings.baseUrl?.trim() || 'https://api.groq.com/openai/v1/chat/completions';
  }

  if (settings.provider === 'azure') {
    return settings.baseUrl?.trim() ?? '';
  }

  return settings.baseUrl?.trim() ?? '';
}
