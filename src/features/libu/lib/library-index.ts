/** UI contracts returned by the backend Libu REST facade. */

export type ScrollType = 'pdf' | 'url' | 'markdown' | 'image' | 'text';
export type ScrollCategory = '经' | '史' | '子' | '集' | '未分';

export interface Chunk {
  id: string;
  scrollId: string;
  index: number;
  text: string;
}

export interface Annotation {
  id: string;
  scrollId: string;
  chunkId?: string;
  text: string;
  createdAt: string;
}

export interface Scroll {
  id: string;
  title: string;
  type: ScrollType;
  category: ScrollCategory;
  source?: string;
  body: string;
  chunks: Chunk[];
  annotations: Annotation[];
  createdAt: string;
  tags: string[];
  wordCount: number;
  lastCitedAt?: string;
}

export interface LibuSearchResult {
  scroll: Scroll;
  chunk: Chunk;
  score: number;
  matchType: 'full-text' | 'semantic' | 'hybrid';
}
