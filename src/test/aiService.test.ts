import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewArtifact, testConnection } from '../services/aiService';
import { AISettings } from '../types';

describe('aiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates empty content', async () => {
    const settings: AISettings = {
      provider: 'openai',
      mode: 'cloud',
      model: 'gpt-4o',
      apiKey: 'sk-test',
    };

    await expect(async () => {
      for await (const _ of reviewArtifact(
        { content: '   ', artifactType: 'requirements', standards: ['ISO 13485'] },
        settings,
      )) {
        // noop
      }
    }).rejects.toThrow('Artifact content is empty.');
  });

  it('validates missing API keys for cloud providers', async () => {
    const settings: AISettings = {
      provider: 'openai',
      mode: 'cloud',
      model: 'gpt-4o',
      apiKey: '',
    };

    await expect(async () => {
      for await (const _ of reviewArtifact(
        { content: 'Software requirement document text', artifactType: 'requirements', standards: ['ISO 13485'] },
        settings,
      )) {
        // noop
      }
    }).rejects.toThrow('API key missing for OPENAI.');
  });

  it('streams OpenAI SSE chunks with separator correctly', async () => {
    const settings: AISettings = {
      provider: 'openai',
      mode: 'cloud',
      model: 'gpt-4o',
      apiKey: 'sk-mock-key',
    };

    const ssePayload = [
      'data: {"choices":[{"delta":{"content":"# Findings\\n- "}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"High: Missing risk trace\\n\\n"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"|||---REVISED_TEXT_SEPARATOR---|||\\n"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"# Updated Spec\\nREQ-001: Verified"}}]}\n\n',
      'data: [DONE]\n\n',
    ].join('');

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(stream, { status: 200 }));

    const events = [];
    for await (const event of reviewArtifact(
      {
        content: 'Original doc content',
        artifactType: 'requirements',
        standards: ['ISO 13485:2016'],
      },
      settings,
    )) {
      events.push(event);
    }

    expect(events.length).toBeGreaterThan(0);
    const reviewEvents = events.filter((e) => e.type === 'review');
    const revisionEvents = events.filter((e) => e.type === 'revision');
    const structuredEvents = events.filter((e) => e.type === 'structured');

    expect(reviewEvents.length).toBeGreaterThan(0);
    expect(revisionEvents.length).toBeGreaterThan(0);
    expect(structuredEvents.length).toBeGreaterThan(0);
  });

  it('handles testConnection for Ollama and OpenAI providers', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'Pong' } }] }), { status: 200 }));

    const ollamaResult = await testConnection({
      provider: 'ollama',
      mode: 'local',
      model: 'llama3.3',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
    });
    expect(ollamaResult.ok).toBe(true);

    const openaiResult = await testConnection({
      provider: 'openai',
      mode: 'cloud',
      model: 'gpt-4o',
      apiKey: 'sk-test',
    });
    expect(openaiResult.ok).toBe(true);
  });
});
