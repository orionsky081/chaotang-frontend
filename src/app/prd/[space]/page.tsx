import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

const VALID_SPACES = [
  'shangshufang',
  'dadian',
  'hubu',
  'bingbu',
  'taiyi',
  'junjichu',
  'jinyiwei',
  'shiguan',
  'zhuangyuan',
] as const;

export const dynamicParams = false;

type SpaceCode = (typeof VALID_SPACES)[number];

const TITLE_MAP: Record<SpaceCode, string> = {
  shangshufang: '上书房 · 朝堂 OS',
  dadian:       '大殿 · 朝堂 OS',
  hubu:         '户部 · 朝堂 OS',
  bingbu:       '兵部 · 朝堂 OS',
  taiyi:        '太医 · 朝堂 OS',
  junjichu:     '军机处 · 朝堂 OS',
  jinyiwei:     '锦衣卫 · 朝堂 OS',
  shiguan:      '史馆 · 朝堂 OS',
  zhuangyuan:   '庄园 · 朝堂 OS',
};

const TARGET_MAP: Record<SpaceCode, string> = {
  shangshufang: '/court-briefing',
  dadian: '/overview',
  hubu: '/departments/finance',
  bingbu: '/departments/ops',
  taiyi: '/health',
  junjichu: '/command-center',
  jinyiwei: '/intel',
  shiguan: '/shiguan',
  zhuangyuan: '/manors',
};

export function generateStaticParams() {
  return VALID_SPACES.map((space) => ({ space }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ space: string }>;
}): Promise<Metadata> {
  const { space } = await params;
  const title = TITLE_MAP[space as SpaceCode] ?? '朝堂 OS';
  return { title };
}

export default async function PrdSpacePage({
  params,
}: {
  params: Promise<{ space: string }>;
}) {
  const { space } = await params;
  if (!VALID_SPACES.includes(space as SpaceCode)) notFound();
  redirect(TARGET_MAP[space as SpaceCode]);
}
