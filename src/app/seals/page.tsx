'use client';

import { DeptSeal, DEPT_SEALS } from '@/components/DeptSeal';

/** 朝堂官印体系展示页 — 11 部门朱红官印 + 帝金变体。设计验收用。 */
export default function SealsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#04060E', padding: '48px 32px', color: '#EAEEFB' }}>
      <header style={{ textAlign: 'center', marginBottom: 48 }}>
        <div className="page-eyebrow" style={{ marginBottom: 8 }}>CHAOTANG · OFFICIAL SEALS</div>
        <h1 className="page-title" style={{ fontSize: 30 }}>朝堂官印体系</h1>
        <p className="body-copy" style={{ maxWidth: 520, margin: '12px auto 0', opacity: 0.8 }}>
          帝金朱印 · 朱红印泥(真公章信号) + 帝金描边(朝堂品牌)。矢量无损，可嵌正式文档落款用印。
        </p>
      </header>

      <section style={{ marginBottom: 56 }}>
        <div className="section-eyebrow" style={{ textAlign: 'center', marginBottom: 24 }}>朱红官印 · 文档落款</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 28, justifyItems: 'center' }}>
          {DEPT_SEALS.map((s) => (
            <div key={s.code} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <DeptSeal name={s.name} kind={s.kind} variant="vermilion" size={150} />
              <div style={{ fontSize: 12, color: '#9AA3C4', fontFamily: 'var(--font-serif)' }}>{s.name} · {s.kind}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-eyebrow" style={{ textAlign: 'center', marginBottom: 24 }}>帝金官印 · 暗金 UI 内嵌</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 24, justifyItems: 'center' }}>
          {DEPT_SEALS.slice(0, 6).map((s) => (
            <DeptSeal key={s.code} name={s.name} kind={s.kind} variant="gold" size={120} />
          ))}
        </div>
      </section>
    </main>
  );
}
