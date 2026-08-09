export class PollingHttpError extends Error {
  status: number;

  constructor(status: number, message = `http_${status}`) {
    super(message);
    this.name = 'PollingHttpError';
    this.status = status;
  }
}

function abortError(): DOMException {
  return new DOMException('Polling aborted', 'AbortError');
}

function defaultWait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

export interface PollUntilTerminalOptions<T> {
  load: () => Promise<T>;
  isTerminal: (value: T) => boolean;
  onUpdate?: (value: T) => void;
  signal?: AbortSignal;
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

export async function pollUntilTerminal<T>(options: PollUntilTerminalOptions<T>): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 120);
  const maxDelayMs = Math.max(0, options.maxDelayMs ?? 5_000);
  const factor = Math.max(1, options.backoffFactor ?? 1.35);
  const wait = options.wait ?? defaultWait;
  let delay = Math.max(0, options.initialDelayMs ?? 800);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw abortError();
    try {
      const value = await options.load();
      options.onUpdate?.(value);
      if (options.isTerminal(value)) return value;
      lastError = undefined;
    } catch (error) {
      if (error instanceof PollingHttpError && error.status === 404) throw error;
      lastError = error;
      if (attempt === maxAttempts) throw error;
    }

    if (attempt === maxAttempts) break;
    await wait(Math.min(delay, maxDelayMs), options.signal);
    if (options.signal?.aborted) throw abortError();
    delay = Math.min(Math.ceil(delay * factor), maxDelayMs);
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error(`polling_exhausted_after_${maxAttempts}_attempts`);
}

