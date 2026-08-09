/**
 * Presentation contracts returned by FastAPI. These are data shapes only;
 * selection, scoring, risk classification and verdict generation must not be
 * implemented in the browser or Next.js runtime.
 */
export type SourceLabel = 'LIVE' | 'LIVE_SWARM' | 'MIXED' | 'FALLBACK' | 'DEMO';
export type RiskLevel = 'low' | 'medium' | 'high';
export type CredTier = 'high' | 'medium' | 'low' | 'unknown';

export type MinistryId = 'personnel' | 'finance' | 'ritual' | 'war' | 'justice' | 'works';
export type MinistrySignal = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY';

export const MINISTRY_NAME_CN: Readonly<Record<MinistryId, string>> = Object.freeze({
  personnel: '吏部',
  finance: '户部',
  ritual: '礼部',
  war: '兵部',
  justice: '刑部',
  works: '工部',
});

export function isLiveSource(label: SourceLabel | string | null | undefined): boolean {
  return label === 'LIVE' || label === 'LIVE_SWARM';
}
