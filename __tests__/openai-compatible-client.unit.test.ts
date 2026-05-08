// @ts-nocheck
import { afterEach, describe, expect, it } from 'bun:test';
import { OpenAICompatibleClient } from '../src/models/providers/OpenAICompatibleClient.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('OpenAICompatibleClient', () => {
  it('chatComplete returns message content on 200', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'hello' } }]
    }), { status: 200 })) as typeof globalThis.fetch;

    const client = new OpenAICompatibleClient({ baseUrl: 'http://localhost:11434/v1' });

    await expect(client.chatComplete({
      model: 'qwen2.5:7b',
      systemPrompt: 'system',
      userPrompt: 'user'
    })).resolves.toBe('hello');
  });

  it('chatComplete returns empty string on HTTP 500', async () => {
    globalThis.fetch = (async () => new Response('boom', { status: 500 })) as typeof globalThis.fetch;

    const client = new OpenAICompatibleClient({ baseUrl: 'http://localhost:11434/v1' });

    await expect(client.chatComplete({
      model: 'qwen2.5:7b',
      systemPrompt: 'system',
      userPrompt: 'user'
    })).resolves.toBe('');
  });

  it('embed returns vector on 200', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({
      data: [{ embedding: [0.1, 0.2, 0.3] }]
    }), { status: 200 })) as typeof globalThis.fetch;

    const client = new OpenAICompatibleClient({ baseUrl: 'http://localhost:11434/v1' });

    await expect(client.embed({
      model: 'nomic-embed-text',
      input: 'hello'
    })).resolves.toEqual([0.1, 0.2, 0.3]);
  });

  it('embed throws on HTTP 503', async () => {
    globalThis.fetch = (async () => new Response('down', { status: 503 })) as typeof globalThis.fetch;

    const client = new OpenAICompatibleClient({ baseUrl: 'http://localhost:11434/v1' });

    await expect(client.embed({
      model: 'nomic-embed-text',
      input: 'hello'
    })).rejects.toThrow('Embedding HTTP 503');
  });

  it('omits Authorization header when apiKey is empty', async () => {
    let headers: Headers | undefined;
    globalThis.fetch = (async (_input, init) => {
      headers = new Headers(init?.headers);
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'ok' } }]
      }), { status: 200 });
    }) as typeof globalThis.fetch;

    const client = new OpenAICompatibleClient({ baseUrl: 'http://localhost:11434/v1', apiKey: '' });
    await client.chatComplete({
      model: 'qwen2.5:7b',
      systemPrompt: 'system',
      userPrompt: 'user'
    });

    expect(headers?.get('Authorization')).toBeNull();
  });
});
