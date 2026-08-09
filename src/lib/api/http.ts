import { withBasePath } from '@/lib/base-path';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  expectJson?: boolean;
}

function isStructuredBody(body: unknown): boolean {
  return body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof Blob
    || body instanceof ReadableStream
    || body instanceof ArrayBuffer
    || ArrayBuffer.isView(body);
}

function toBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === 'string' || isStructuredBody(body)) return body as BodyInit;
  return JSON.stringify(body);
}

function mergeHeaders(
  explicit?: HeadersInit,
  shouldSendJson = false,
): Record<string, string> {
  const base: Record<string, string> = {
    Accept: 'application/json',
  };
  if (shouldSendJson) base['Content-Type'] = 'application/json';
  if (!explicit) return base;

  if (explicit instanceof Headers) {
    return Object.fromEntries(explicit.entries());
  }
  return { ...base, ...(explicit as Record<string, string>) };
}

function toAbsoluteApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return withBasePath(path);
}

export function buildApiRequestInit(input: ApiRequestOptions = {}): RequestInit {
  const { body, headers, timeoutMs, expectJson, ...init } = input;
  const sendJsonBody = body !== undefined && !isStructuredBody(body) && typeof body !== 'string';
  return {
    ...init,
    headers: mergeHeaders(headers, sendJsonBody),
    body: toBody(body),
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : init.signal,
  };
}

export function normalizeApiResponseText(
  responseText: string,
  options: Pick<ApiRequestOptions, 'expectJson'> = {},
): string | undefined {
  if (options.expectJson === false) return responseText;
  if (!responseText) return undefined;
  return responseText;
}

export function parseJson<T>(
  responseText: string,
  options: Pick<ApiRequestOptions, 'expectJson'> = {},
  status: number,
): T {
  if (options.expectJson === false || status === 204) {
    return undefined as unknown as T;
  }
  if (!responseText) return (null as unknown) as T;
  return JSON.parse(responseText) as T;
}

export function buildAbsoluteApiUrl(path: string): string {
  return toAbsoluteApiUrl(path);
}
