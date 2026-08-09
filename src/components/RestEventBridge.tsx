'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { apiGateway, API_PATHS } from '@/lib/api/gateway';

interface ObservabilityEvent {
  event_id?: string;
  topic?: string;
  status?: string;
  message?: string;
  task_id?: string;
  run_id?: string;
}

interface ObservabilityEnvelope {
  events?: ObservabilityEvent[];
}

const EVENTS_API = API_PATHS.frontend.courtObservabilityEvents;
const POLL_MS = 5_000;

function eventKey(event: ObservabilityEvent): string {
  return event.event_id
    ?? [event.topic, event.task_id, event.run_id, event.status, event.message].filter(Boolean).join(':');
}

function label(event: ObservabilityEvent): string {
  return event.message
    ?? [event.topic ?? '朝局事件', event.status].filter(Boolean).join(' · ');
}

/** Global notifications backed only by bounded same-origin REST polling. */
export function RestEventBridge() {
  useEffect(() => {
    const seen = new Set<string>();
    let primed = false;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const poll = async () => {
      controller = new AbortController();
      try {
        const payload = await apiGateway.get<ObservabilityEnvelope>(`${EVENTS_API}?limit=50`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        for (const event of payload.events ?? []) {
          const key = eventKey(event);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          if (!primed) continue;
          if (event.status === 'failed' || event.status === 'error') {
            toast.error(label(event), { duration: 3_000 });
          } else if (event.status === 'done' || event.status === 'completed') {
            toast.success(label(event), { duration: 2_500 });
          }
        }
        primed = true;
        if (seen.size > 500) seen.clear();
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          // Global notifications are non-critical; page-specific REST state remains authoritative.
        }
      } finally {
        if (!stopped) timer = setTimeout(poll, POLL_MS);
      }
    };

    void poll();
    return () => {
      stopped = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
