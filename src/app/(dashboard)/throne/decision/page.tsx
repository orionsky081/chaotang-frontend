'use client';

/**
 * /throne/decision —— 决策闭环最小演示页（CourtOSRuntime + /api/court/decision）。
 *
 * 独立新增，不触碰 ShangshufangPage（避免在 2907 行单一通路里插第二条路）。
 * 一句话下旨 → 拿到带来源标签/缺证/质门的奏折。日后再从容并进上书房。
 */
import { useState } from 'react';
import { ApiError, apiGateway, API_PATHS } from '@/lib/api/gateway';

interface DecisionReport {
  verdict?: string;
  summary?: string;
  perspectives?: unknown[];
  evidence?: unknown[];
  missingEvidence?: string[];
  risks?: unknown[];
  nextAction?: string;
  sourceLabel?: string;
  needsHumanConfirmation?: boolean;
}
interface MinistryReview {
  overallSignal?: string;
  overallSuggestion?: string;
  vetoes?: string[];
  conflicts?: Array<{ between: [string, string]; summary: string }>;
  cards?: Array<{ ministryId: string; signal: string; ruling: string; deputyChallenge: string }>;
}
interface PriorCase {
  originalQuestion: string;
  verdict?: string;
  reusableLessons?: string[];
}
interface DecisionData {
  state: string;
  refinedIntent?: string;
  report?: DecisionReport;
  sourceLabel?: string;
  needsHumanConfirmation?: boolean;
  ministryReview?: MinistryReview;
  imperialReport?: { verdict?: string; oneSentence?: string; ministrySignals?: Record<string, string> };
  priorCases?: PriorCase[];
}

type DecisionResponse = {
  success: boolean;
  data?: DecisionData;
  error?: string;
};

const MINISTRY_CN: Record<string, string> = {
  personnel: '吏部', finance: '户部', ritual: '礼部', war: '兵部', justice: '刑部', works: '工部',
};
const SIGNAL_TONE: Record<string, string> = { GREEN: '#3ECF8E', YELLOW: '#D4A84B', RED: '#E0535B', GRAY: '#7C7C7C' };

const SOURCE_TONE: Record<string, string> = {
  LIVE: '#3ECF8E',
  LIVE_SWARM: '#3ECF8E',
  MIXED: '#D4A84B',
  FALLBACK: '#E0913A',
  DEMO: '#E0913A',
};

export default function DecisionDemoPage() {
  const [question, setQuestion] = useState('');
  const [gaps, setGaps] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DecisionData | null>(null);

  async function submit() {
    if (question.trim().length < 5) {
      setError('问题至少 5 字');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const json = await apiGateway.post<DecisionResponse>(API_PATHS.frontend.courtDecision, {
        question,
        missingEvidence: gaps.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean),
      });
      if (!json.success || !json.data) {
        throw new Error(json.error ?? '请求失败');
      }
      setData(json.data);
    } catch (e) {
      if (e instanceof ApiError) {
        try {
          const payload = JSON.parse(e.body) as { error?: string };
          setError(payload.error ?? e.message);
          return;
        } catch {
          setError(e.message);
          return;
        }
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const report = data?.report;
  const label = data?.sourceLabel ?? 'DEMO';

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <p className="page-eyebrow">CourtOS · Decision Loop</p>
      <h1 className="page-title">御前决策（最小闭环演示）</h1>
      <p className="body-copy" style={{ marginBottom: '1.5rem' }}>
        一句话下旨 → 丞相拟旨 → 军机处会审 → 奏折（带来源 / 缺证 / 质门）。
      </p>

      <label className="section-eyebrow" htmlFor="q">真实经营问题</label>
      <textarea
        id="q"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        placeholder="例：判断 100MWh 冷库储能项目是否推进，重点看投入边界与现金风险"
        style={textareaStyle}
      />
      <label className="section-eyebrow" htmlFor="g" style={{ marginTop: '0.75rem', display: 'block' }}>
        已知缺证（逗号分隔，可空）
      </label>
      <input
        id="g"
        value={gaps}
        onChange={(e) => setGaps(e.target.value)}
        placeholder="报价单, 交期, BOM, 客户承诺"
        style={inputStyle}
      />
      <button onClick={submit} disabled={loading} style={buttonStyle}>
        {loading ? '军机处会审中…' : '发起会审'}
      </button>

      {error && <p style={{ color: '#E0913A', marginTop: '1rem' }}>⚠ {error}</p>}

      {report && (
        <section aria-labelledby="verdict" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id="verdict" className="section-title">圣裁：{report.verdict ?? '—'}</h2>
            <span style={{ ...badgeStyle, color: SOURCE_TONE[label] ?? '#999', borderColor: SOURCE_TONE[label] ?? '#999' }}>
              {label}
            </span>
          </div>
          {data?.needsHumanConfirmation && (
            <p style={confirmBanner}>⚠ 高风险 / 缺证 / 非实时来源——采纳需人工确认（质门）</p>
          )}
          {data?.refinedIntent && <Field title="拟旨" body={data.refinedIntent} />}
          {report.summary && <Field title="概要" body={report.summary} />}
          {report.nextAction && <Field title="后令" body={report.nextAction} />}
          <ListField title="风险" items={report.risks} />
          <ListField title="缺证" items={report.missingEvidence} />
          <p className="page-meta" style={{ marginTop: '1rem' }}>状态：{data?.state}</p>
        </section>
      )}

      {data?.ministryReview && (
        <section aria-labelledby="ministries" style={cardStyle}>
          <h2 id="ministries" className="section-title">六部会审 · 灯号</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8, marginTop: '0.75rem' }}>
            {(data.ministryReview.cards ?? []).map((c) => (
              <div key={c.ministryId} style={{ border: `1px solid ${SIGNAL_TONE[c.signal] ?? '#555'}`, borderRadius: 8, padding: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>{MINISTRY_CN[c.ministryId] ?? c.ministryId}</strong>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: SIGNAL_TONE[c.signal] ?? '#555' }} />
                </div>
                <p className="page-meta" style={{ marginTop: 4 }}>{c.ruling}</p>
              </div>
            ))}
          </div>
          {(data.ministryReview.vetoes?.length ?? 0) > 0 && (
            <p style={{ color: '#E0535B', marginTop: '0.75rem', fontSize: 13 }}>
              🔴 否决：{data.ministryReview.vetoes!.map((v) => MINISTRY_CN[v] ?? v).join('、')}
            </p>
          )}
          {(data.ministryReview.conflicts?.length ?? 0) > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <p className="section-eyebrow">部门冲突（不平均，摊给你裁）</p>
              <ul className="body-copy" style={{ paddingLeft: '1.2rem' }}>
                {data.ministryReview.conflicts!.map((cf, i) => <li key={i}>{cf.summary}</li>)}
              </ul>
            </div>
          )}
        </section>
      )}

      {(data?.priorCases?.length ?? 0) > 0 && (
        <section aria-labelledby="prior" style={cardStyle}>
          <h2 id="prior" className="section-title">史馆 · 历史镜鉴</h2>
          {data!.priorCases!.map((p, i) => (
            <div key={i} style={{ marginTop: '0.6rem' }}>
              <p className="body-copy" style={{ margin: 0 }}>旧案：{p.originalQuestion}（{p.verdict ?? '—'}）</p>
              {(p.reusableLessons?.length ?? 0) > 0 && (
                <p className="page-meta">教训：{p.reusableLessons!.join('；')}</p>
              )}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function Field({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ marginTop: '0.9rem' }}>
      <p className="section-eyebrow">{title}</p>
      <p className="body-copy" style={{ whiteSpace: 'pre-wrap' }}>{body}</p>
    </div>
  );
}
function ListField({ title, items }: { title: string; items?: unknown[] }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginTop: '0.9rem' }}>
      <p className="section-eyebrow">{title}</p>
      <ul className="body-copy" style={{ paddingLeft: '1.2rem' }}>
        {items.map((it, i) => (
          <li key={i}>{typeof it === 'string' ? it : JSON.stringify(it)}</li>
        ))}
      </ul>
    </div>
  );
}

const textareaStyle: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,168,75,0.25)', borderRadius: 8, color: 'var(--color-text, #e8e2d2)', padding: '0.75rem', fontFamily: 'inherit', fontSize: 14 };
const inputStyle: React.CSSProperties = { ...textareaStyle, marginTop: 4 };
const buttonStyle: React.CSSProperties = { marginTop: '1rem', padding: '0.6rem 1.4rem', borderRadius: 8, border: '1px solid #D4A84B', background: 'linear-gradient(135deg, #D4A84B, #8A6A2A)', color: '#1a1408', fontWeight: 600, cursor: 'pointer' };
const cardStyle: React.CSSProperties = { marginTop: '1.5rem', padding: '1.25rem', border: '1px solid rgba(212,168,75,0.3)', borderRadius: 12, background: 'rgba(8,10,18,0.5)' };
const badgeStyle: React.CSSProperties = { fontSize: 11, letterSpacing: '0.1em', padding: '2px 10px', border: '1px solid', borderRadius: 999 };
const confirmBanner: React.CSSProperties = { marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(224,145,58,0.12)', border: '1px solid rgba(224,145,58,0.4)', borderRadius: 8, color: '#E0913A', fontSize: 13 };
