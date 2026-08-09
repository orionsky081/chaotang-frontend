/** REST-backed Libu view store. Chunking, search and persistence live in FastAPI. */
'use client';

import { create } from 'zustand';
import type { LibuSearchResult, Scroll, ScrollCategory, ScrollType } from './library-index';
import { API_PATHS } from '@/lib/api/gateway';
import { api } from '@/lib/api';

export interface IngestTextInput {
  title?: string;
  body?: string;
  category?: ScrollCategory;
  type?: ScrollType;
  source?: string;
  tags?: string[];
}

interface LibuState {
  scrolls: Scroll[];
  hydrate: () => Promise<void>;
  addScroll: (input: IngestTextInput) => Promise<Scroll>;
  removeScroll: (id: string) => Promise<void>;
  updateScroll: (id: string, patch: Pick<Partial<Scroll>, 'title' | 'category' | 'tags'>) => Promise<Scroll>;
  addAnnotation: (scrollId: string, text: string, chunkId?: string) => Promise<Scroll>;
  markCited: (scrollId: string) => Promise<Scroll>;
}

function libuPath(path: string): string {
  return path.startsWith(API_PATHS.frontend.libu) ? path : `${API_PATHS.frontend.libu}${path}`;
}

function replaceScroll(scrolls: Scroll[], updated: Scroll): Scroll[] {
  return scrolls.map((scroll) => (scroll.id === updated.id ? updated : scroll));
}

export async function searchLibu(query: string, limit = 8): Promise<LibuSearchResult[]> {
  return api.post<LibuSearchResult[]>(libuPath('/search'), { query, limit });
}

export const useLibuStore = create<LibuState>()((set) => ({
  scrolls: [],

  hydrate: async () => {
    set({ scrolls: await api.get<Scroll[]>(libuPath('/assets')) });
  },

  addScroll: async (input) => {
    const created = await api.post<Scroll>(libuPath('/assets'), input);
    set((state) => ({ scrolls: [created, ...state.scrolls] }));
    return created;
  },

  removeScroll: async (id) => {
    await api.del<void>(libuPath(`/assets/${encodeURIComponent(id)}`));
    set((state) => ({ scrolls: state.scrolls.filter((scroll) => scroll.id !== id) }));
  },

  updateScroll: async (id, patch) => {
    const updated = await api.patch<Scroll>(libuPath(`/assets/${encodeURIComponent(id)}`), patch);
    set((state) => ({ scrolls: replaceScroll(state.scrolls, updated) }));
    return updated;
  },

  addAnnotation: async (scrollId, text, chunkId) => {
    const updated = await api.post<Scroll>(
      libuPath(`/assets/${encodeURIComponent(scrollId)}/annotations`),
      { text, ...(chunkId ? { chunkId } : {}) },
    );
    set((state) => ({ scrolls: replaceScroll(state.scrolls, updated) }));
    return updated;
  },

  markCited: async (scrollId) => {
    const updated = await api.post<Scroll>(libuPath(`/assets/${encodeURIComponent(scrollId)}/cited`), undefined);
    set((state) => ({ scrolls: replaceScroll(state.scrolls, updated) }));
    return updated;
  },
}));
