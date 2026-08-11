'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowRight, FastForward, Play } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { assetUrl } from '@/lib/asset';
import { AUTH_STORAGE_KEY } from '@/lib/auth';
import { BrandLogo } from '@/components/BrandLogo';

const INTRO_DURATION_MS = 22500;
const CTA_REVEAL_MS = 3200;
const SCENE_DURATIONS = [2600, 3000, 3200, 3500, 3900, 6300] as const;
const AUTH_ENTRY_PATH = '/login';

type Scene = {
  kicker: string;
  headline: string;
  accent: string;
  body: string;
  focus: string;
};

const SCENES = [
  {
    kicker: 'COURTOS V2',
    headline: 'AI 时代的竞争',
    accent: '',
    body: '不是模型的竞赛，而是智能体军团的竞赛。',
    focus: '序幕',
  },
  {
    kicker: 'AGENT LEGION',
    headline: '是属于智能体军团的竞争',
    accent: '',
    body: '真正的胜负，取决于组织效率、协同质量与执行速度。',
    focus: '军团',
  },
  {
    kicker: 'EVOLUTION',
    headline: '和你的智能体军团一起进化',
    accent: '',
    body: '让信息先被压缩，让判断先被解释，让执行先被安排。',
    focus: '进化',
  },
  {
    kicker: 'AGI FUSION',
    headline: '这是融合 AGI 的开始',
    accent: '',
    body: '不再围绕单个模型工作，而是围绕整支军团持续演化。',
    focus: '融合',
  },
  {
    kicker: 'EASTERN COSMOS',
    headline: '飞云之上',
    accent: '天人合一',
    body: '让你的数字分身、丞相与群臣，在同一座大殿中持续汇报，与你同频共振。',
    focus: '东方',
  },
  {
    kicker: 'ORIENTAL CIVILIZATION',
    headline: '东方文明',
    accent: '焕发生机',
    body: '用东方治理智慧，为智能时代建立新的秩序与生机。',
    focus: '落幕',
  },
] as const satisfies readonly Scene[];

const FLOATING_SIGNALS = [
  { title: '信息', body: '先被压缩', tone: 'gold', x: '14%', y: '29%', delay: '0.1s' },
  { title: '判断', body: '先被解释', tone: 'blue', x: '78%', y: '24%', delay: '0.5s' },
  { title: '执行', body: '先被安排', tone: 'green', x: '18%', y: '69%', delay: '0.9s' },
  { title: '秩序', body: '焕发生机', tone: 'red', x: '80%', y: '66%', delay: '1.2s' },
] as const;

const MEMORIAL_LINES = ['信息', '判断', '执行', '军团', '秩序', '生机'] as const;

function getSceneIndex(elapsedMs: number) {
  let cursor = 0;
  for (let i = 0; i < SCENE_DURATIONS.length; i += 1) {
    cursor += SCENE_DURATIONS[i] ?? 0;
    if (elapsedMs < cursor) return i;
  }
  return SCENES.length - 1;
}

function IntroPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const holdCinematic = searchParams.get('hold') === '1';
  const forceReplay = searchParams.get('force') === '1';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceReplay) return;
    const seen = window.localStorage.getItem('courtos.intro.seen');
    const loggedIn = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (seen || loggedIn) {
      router.replace(AUTH_ENTRY_PATH);
    }
  }, [forceReplay, router]);

  useEffect(() => {
    const startAt = window.performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(window.performance.now() - startAt);
    }, 80);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (holdCinematic) return;
    if (elapsedMs < INTRO_DURATION_MS) return;
    if (isClosing) return;
    finishIntro();
  }, [elapsedMs, holdCinematic, isClosing]);

  const activeSceneIndex = useMemo(() => getSceneIndex(elapsedMs), [elapsedMs]);
  const activeScene = SCENES[activeSceneIndex] ?? SCENES[0];
  const progress = Math.min(elapsedMs / INTRO_DURATION_MS, 1);
  const showCta = elapsedMs >= CTA_REVEAL_MS || holdCinematic;
  const readyLineCount = Math.min(MEMORIAL_LINES.length, activeSceneIndex + 1);

  function finishIntro() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('courtos.intro.seen', String(Date.now()));
      setIsClosing(true);
      window.setTimeout(() => {
        router.replace(AUTH_ENTRY_PATH);
      }, 940);
      return;
    }
    router.replace(AUTH_ENTRY_PATH);
  }

  return (
    <main
      className={`vision-intro-stage vision-intro-scene-${activeSceneIndex + 1} ${isClosing ? 'is-closing' : ''}`}
      style={{ ['--intro-progress' as string]: progress }}
    >
      <div className="vision-intro-curtain" aria-hidden="true" />
      <div className="vision-intro-image" aria-hidden="true">
        <div
          className="vision-intro-image-inner"
          style={{
            backgroundImage: `url(${assetUrl('/assets/intro/courtos-vision-hero.png')})`,
          }}
        />
      </div>
      <div className="vision-intro-depth" aria-hidden="true" />
      <div className="vision-intro-light vision-intro-light-gold" aria-hidden="true" />
      <div className="vision-intro-light vision-intro-light-blue" aria-hidden="true" />
      <div className="vision-intro-light vision-intro-light-red" aria-hidden="true" />

      <header className="vision-intro-topbar">
        <div className="vision-intro-brand" aria-label="CourtOS">
          <BrandLogo className="vision-intro-brand-mark" />
          <strong>CourtOS</strong>
        </div>
        <button type="button" className="vision-intro-skip" onClick={finishIntro}>
          <FastForward size={15} aria-hidden="true" />
          跳过
        </button>
      </header>

      <section className="vision-intro-hero" aria-label="朝堂 OS 空间开场">
        <div className="vision-intro-eyebrow" key={activeScene.kicker}>
          {activeScene.kicker}
        </div>
        <h1 className="vision-intro-title display-serif" key={activeScene.headline}>
          {activeScene.headline}
        </h1>
        {activeScene.accent ? (
          <p className="vision-intro-subhead" key={activeScene.accent}>
            {activeScene.accent}
          </p>
        ) : null}
        <p className="vision-intro-body" key={activeScene.body}>
          {activeScene.body}
        </p>
      </section>

      <div className="vision-intro-spatial-layer" aria-hidden="true">
        {FLOATING_SIGNALS.map((signal, index) => (
          <div
            key={signal.title}
            className={`vision-intro-signal vision-intro-signal-${signal.tone}`}
            style={{
              left: signal.x,
              top: signal.y,
              animationDelay: signal.delay,
              opacity: activeSceneIndex >= index ? 1 : 0.16,
            }}
          >
            <span>{signal.title}</span>
            <strong>{signal.body}</strong>
          </div>
        ))}
      </div>

      <aside className="vision-intro-memorial" aria-hidden="true">
        <span className="vision-intro-memorial-kicker">{activeScene.focus}</span>
        {MEMORIAL_LINES.map((line, index) => (
          <div key={line} className={index < readyLineCount ? 'is-ready' : ''}>
            <span>{line}</span>
            <em>{index < readyLineCount ? '已归位' : '等待'}</em>
          </div>
        ))}
      </aside>

      <div className={`vision-intro-actions ${showCta ? 'is-visible' : ''}`}>
        <button type="button" className="vision-intro-primary" onClick={finishIntro}>
          <Play size={15} fill="currentColor" aria-hidden="true" />
          进入朝堂 OS
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <a className="vision-intro-secondary" href={assetUrl('/intro?force=1&hold=1')}>
          观看完整开场
        </a>
      </div>

      <div className="vision-intro-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>
    </main>
  );
}

export default function IntroPage() {
  return (
    <Suspense fallback={<main className="vision-intro-stage" />}>
      <IntroPageBody />
    </Suspense>
  );
}
