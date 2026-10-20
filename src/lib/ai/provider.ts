import { supabase } from '@/lib/supabase';
import { buildMessages, type PromptOptions } from './prompt';
import { extractJson, parseAiPayload } from './schema';
import { AiRequestError, type AiProviderId, type AiResponsePayload, type TutorTurn } from './types';

export interface ProviderRequest {
  options: PromptOptions;
  signal?: AbortSignal;
}

export interface AiProvider {
  readonly id: AiProviderId;
  readonly label: string;
  /** True when the provider has everything it needs to reach a model. */
  isConfigured(): boolean;
  /** Short user-facing reason when not configured. */
  configurationHint(): string;
  complete(request: ProviderRequest): Promise<AiResponsePayload & { model?: string }>;
}

const EDGE_FUNCTION_NAME = 'tutor-reply';
const DEFAULT_TIMEOUT_MS = 20000;

function readEnv(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Primary provider: a Supabase Edge Function that holds the LLM credential
 * server-side. The browser never sees an API key.
 */
class SupabaseEdgeProvider implements AiProvider {
  readonly id: AiProviderId = 'supabase-edge';
  readonly label = 'Supabase Edge Function';

  isConfigured(): boolean {
    // The edge function can exist without client-side env config, so this is
    // always "tryable". A missing function surfaces as a server error and the
    // client falls back.
    return Boolean(readEnv('VITE_SUPABASE_URL'));
  }

  configurationHint(): string {
    return 'Deploy the tutor-reply edge function: supabase functions deploy tutor-reply';
  }

  async complete(request: ProviderRequest): Promise<AiResponsePayload & { model?: string }> {
    const { options, signal } = request;
    const messages = buildMessages(options);

    // This supabase-js version's invoke() takes no abort signal, so the
    // timeout is enforced by racing the request rather than cancelling it.
    const { data, error } = await withTimeout(
      supabase.functions.invoke(EDGE_FUNCTION_NAME, {
        body: { messages, mode: options.mode },
      }),
      signal,
    );

    if (error) throw mapFunctionError(error);
    return finalize(unwrapFunctionData(data));
  }
}

/**
 * Alternative provider for teams that run their own gateway. The gateway must
 * speak the OpenAI-compatible chat contract and hold the credential itself.
 */
class HttpProxyProvider implements AiProvider {
  readonly id: AiProviderId = 'http-proxy';
  readonly label = 'HTTP proxy gateway';

  isConfigured(): boolean {
    return Boolean(readEnv('VITE_AI_PROXY_URL'));
  }

  configurationHint(): string {
    return 'Set VITE_AI_PROXY_URL to your gateway that proxies an OpenAI-compatible chat endpoint.';
  }

  async complete(request: ProviderRequest): Promise<AiResponsePayload & { model?: string }> {
    const baseUrl = readEnv('VITE_AI_PROXY_URL');
    if (!baseUrl) {
      throw new AiRequestError('not-configured', 'No AI gateway is configured.', false);
    }

    const { options, signal } = request;
    const timeout = createTimeoutSignal(signal);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ messages: buildMessages(options), mode: options.mode }),
        signal: timeout.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiRequestError('unauthorized', 'The AI gateway rejected this session.', false);
      }
      if (response.status === 429) {
        throw new AiRequestError('rate-limit', 'The tutor is busy right now. Try again in a moment.');
      }
      if (!response.ok) {
        throw new AiRequestError('server', `The AI gateway returned ${response.status}.`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      return finalize(extractFromOpenAiShape(json));
    } catch (err) {
      if (timeout.timedOut) throw new AiRequestError('timeout', 'The tutor took too long to respond.');
      throw normalizeError(err);
    } finally {
      timeout.dispose();
    }
  }
}

export const aiProviders: AiProvider[] = [new SupabaseEdgeProvider(), new HttpProxyProvider()];

/** Picks the first configured provider, defaulting to the edge function. */
export function resolveProvider(preferred?: AiProviderId): AiProvider {
  if (preferred) {
    const match = aiProviders.find((p) => p.id === preferred);
    if (match?.isConfigured()) return match;
  }
  return aiProviders.find((p) => p.isConfigured()) ?? aiProviders[0];
}

function unwrapFunctionData(data: unknown): unknown {
  if (typeof data === 'string') return extractJson(data);
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    // The edge function returns { reply, corrections, ... } directly, or wraps
    // a provider response in { content }.
    if (typeof record.content === 'string') return extractJson(record.content);
    if (typeof record.choices === 'object') return extractFromOpenAiShape(record);
    return record;
  }
  return null;
}

function extractFromOpenAiShape(json: Record<string, unknown>): unknown {
  const choices = json.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string') return extractJson(message.content);
    if (typeof first?.text === 'string') return extractJson(first.text);
  }
  if (typeof json.content === 'string') return extractJson(json.content);
  if (typeof json.output_text === 'string') return extractJson(json.output_text);
  return json;
}

function finalize(payload: unknown): AiResponsePayload & { model?: string } {
  const parsed = parseAiPayload(payload);
  if (!parsed) {
    throw new AiRequestError('invalid-response', 'The tutor sent something unexpected.', true);
  }
  const model =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>).model : undefined;
  return typeof model === 'string' ? { ...parsed, model } : parsed;
}

function mapFunctionError(error: { message?: string; name?: string; context?: unknown }): AiRequestError {
  const status = (error.context as { status?: number } | undefined)?.status;
  if (status === 429) return new AiRequestError('rate-limit', 'The tutor is busy right now. Try again shortly.');
  if (status === 401 || status === 403) return new AiRequestError('unauthorized', 'The tutor could not be authorized.', false);
  if (status === 400) return new AiRequestError('invalid-response', 'The tutor request was rejected.', false);

  const message = error.message ?? '';
  // supabase-js reports a missing edge function with this shape.
  if (message.includes('FunctionsHttpError') || message.includes('Edge Function')) {
    return new AiRequestError('server', 'The tutor service is not deployed yet.', false);
  }
  if (message.toLowerCase().includes('fetch failed')) {
    return new AiRequestError('network', 'No connection to the tutor service.');
  }
  return new AiRequestError('server', message || 'The tutor service failed.', true);
}

function normalizeError(err: unknown): AiRequestError {
  if (err instanceof AiRequestError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AiRequestError('cancelled', 'The request was cancelled.', false);
  }
  if (err instanceof TypeError) {
    return new AiRequestError('network', 'No connection to the tutor service.');
  }
  return new AiRequestError('unknown', err instanceof Error ? err.message : 'Something went wrong.');
}

/**
 * Races a promise against a timeout, since the Supabase invoke() wrapper in
 * this version exposes no abort signal. An external signal (when the caller
 * cancels) wins over the timeout.
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  external?: AbortSignal,
): Promise<T> {
  const timeoutMs = Number(readEnv('VITE_AI_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;

  if (external?.aborted) {
    throw new AiRequestError('cancelled', 'The request was cancelled.', false);
  }

  let timer: number | undefined;
  let onExternalAbort: (() => void) | undefined;

  const guards: Promise<never>[] = [
    new Promise((_resolve, reject) => {
      timer = window.setTimeout(
        () => reject(new AiRequestError('timeout', 'The tutor took too long to respond.')),
        timeoutMs,
      );
    }),
  ];

  if (external) {
    guards.push(
      new Promise((_resolve, reject) => {
        onExternalAbort = () =>
          reject(new AiRequestError('cancelled', 'The request was cancelled.', false));
        external.addEventListener('abort', onExternalAbort, { once: true });
      }),
    );
  }

  try {
    return await Promise.race([promise, ...guards]);
  } catch (err) {
    throw err instanceof AiRequestError ? err : normalizeError(err);
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
    if (onExternalAbort && external) external.removeEventListener('abort', onExternalAbort);
  }
}

function createTimeoutSignal(external?: AbortSignal): {
  signal: AbortSignal;
  timedOut: boolean;
  dispose: () => void;
} {
  const timeoutMs = Number(readEnv('VITE_AI_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const state = { signal: controller.signal, timedOut: false, dispose: () => {} };

  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', forwardAbort, { once: true });
  }

  state.dispose = () => {
    clearTimeout(timer);
    external?.removeEventListener('abort', forwardAbort);
  };

  return state;
}

export type { TutorTurn };
