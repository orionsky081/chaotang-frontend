import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileSearch,
  MapPinned,
  Stamp,
  TicketCheck,
  WalletCards,
} from 'lucide-react';

import { GlassPanel } from '@/components/GlassPanel';
import type { CriterionStatus } from '@/lib/contracts/fulfillment';

import type {
  ChancellorCriterionView,
  ChancellorReplyView as ChancellorReplyViewModel,
  ReplyEvidenceKind,
} from './chancellor-reply-projection';

const STATUS_PRESENTATION: Readonly<Record<CriterionStatus, {
  label: string;
  color: string;
  icon: typeof CheckCircle2;
}>> = {
  achieved: { label: '后端判定 · 已兑现', color: '#3DD68C', icon: CheckCircle2 },
  not_achieved: { label: '后端判定 · 未兑现', color: '#F43F5E', icon: AlertTriangle },
  unverifiable: { label: '后端判定 · 无法核验', color: '#F5A524', icon: CircleHelp },
};

const EVIDENCE_LABEL: Readonly<Record<ReplyEvidenceKind, string>> = {
  execution: '执行产物',
  domain: '领域证据',
  independent: '独立核验',
};

export function ChancellorReplyView({
  reply,
  runtimeAuthority,
}: {
  reply: ChancellorReplyViewModel;
  runtimeAuthority: 'LANGGRAPH';
}) {
  const completion = reply.completionStatus === null
    ? { label: '后端未提供兑现判定', color: '#8F98B8' }
    : reply.completionStatus === 'complete'
      ? { label: '后端总判定 · 已兑现', color: '#3DD68C' }
      : { label: '后端总判定 · 未完整兑现', color: '#F5A524' };

  return (
    <section className="space-y-4" data-testid="chancellor-unified-reply">
      <GlassPanel padding="md" hudCorners glow>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="page-eyebrow">丞相统一回奏</div>
            <p className="page-meta mt-1">六部结论、证据与缺口已由后端合成为一次呈报</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded border border-[#7EC8E3]/35 bg-[#7EC8E3]/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#9EDDF2]"
              data-testid="runtime-authority"
            >
              {runtimeAuthority} 唯一权威
            </span>
            <span
              className="rounded border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                borderColor: `${completion.color}55`,
                background: `${completion.color}12`,
                color: completion.color,
              }}
              data-testid="reply-completion-status"
            >
              {completion.label}
            </span>
          </div>
        </div>

        <div
          className="rounded-lg border border-[#F0C66A]/25 px-5 py-5"
          style={{ background: 'linear-gradient(180deg, rgba(240,198,106,0.075), rgba(4,6,14,0.2))' }}
        >
          <div className="section-eyebrow mb-2">回奏结论</div>
          <p
            className="text-[18px] leading-8 text-[#F5E9C9]"
            style={{ fontFamily: 'var(--font-serif)' }}
            data-testid="reply-conclusion"
          >
            {reply.conclusion}
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <div className="section-eyebrow mb-2">关键理由 · 最多三条</div>
            {reply.keyReasons.length > 0 ? (
              <ol className="space-y-2" data-testid="reply-key-reasons">
                {reply.keyReasons.map((reason, index) => (
                  <li
                    key={`${index}-${reason}`}
                    className="flex gap-3 rounded border border-[#F0C66A]/12 bg-[#F0C66A]/[0.025] px-3 py-2.5 text-sm leading-6 text-[#D8D0B8]"
                  >
                    <span className="font-mono text-xs text-[#D4A84B]">{index + 1}</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[#8F98B8]">后端未提供关键理由。</p>
            )}
          </div>

          <div>
            <div className="section-eyebrow mb-2">唯一下一步</div>
            <div
              className="h-full rounded border border-[#7EC8E3]/20 bg-[#7EC8E3]/[0.04] px-4 py-3 text-sm leading-6 text-[#C9E9F5]"
              data-testid="reply-next-action"
            >
              {reply.nextAction}
            </div>
          </div>
        </div>
      </GlassPanel>

      <TravelDecisionBrief reply={reply} />

      <GlassPanel padding="md">
        <div className="mb-3 flex items-center gap-2">
          <FileSearch size={16} color="#F0C66A" />
          <div>
            <div className="section-title">旨意逐项兑现</div>
            <p className="page-meta mt-0.5">状态与缺口均为后端裁决；浏览器不重新判断</p>
          </div>
        </div>

        {reply.criteria.length > 0 ? (
          <div className="space-y-3" data-testid="reply-criteria">
            {reply.criteria.map((criterion) => (
              <CriterionRow key={criterion.id} criterion={criterion} />
            ))}
          </div>
        ) : (
          <div className="rounded border border-[#F5A524]/20 bg-[#F5A524]/[0.035] px-4 py-3 text-sm text-[#D5B979]">
            此回奏尚无兑现矩阵，不能从页面推断是否完成。
          </div>
        )}
      </GlassPanel>

      <details className="group rounded-lg border border-[#F0C66A]/16 bg-[#080B16]/80">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-[#D9C79A]">
          <span>展开完整案卷 · 分歧、未知、风险与证据索引</span>
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 border-t border-[#F0C66A]/12 p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="page-eyebrow mb-2">六部分奏</div>
            {reply.dossier.departmentMemorials.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {reply.dossier.departmentMemorials.map((memorial) => (
                  <div key={memorial.department_id} className="rounded border border-[#F0C66A]/10 px-3 py-2">
                    <div className="text-xs font-semibold text-[#D9C79A]">{memorial.department_id}</div>
                    <p className="mt-1 text-xs leading-5 text-[#C8CDD8]">{memorial.position}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#8F98B8]">{memorial.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#626B8B]">后端未提供六部分奏</p>
            )}
          </div>

          <div>
            <div className="page-eyebrow mb-2">锦衣卫核验</div>
            {reply.dossier.verificationRecords.length > 0 ? (
              <div className="space-y-2">
                {reply.dossier.verificationRecords.map((record) => (
                  <div key={record.verification_ref} className="rounded border border-[#7EC8E3]/15 px-3 py-2">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-[#C9E9F5]">{record.criterion}</span>
                      <span className="font-mono text-[#7EC8E3]">{record.outcome}</span>
                    </div>
                    <ul className="mt-1 space-y-1 text-[11px] leading-5 text-[#8F98B8]">
                      {record.findings.map((finding) => <li key={finding}>· {finding}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#626B8B]">后端未提供锦衣卫核验记录</p>
            )}
          </div>

          <div className="rounded border border-[#F0C66A]/10 px-3 py-2">
            <div className="page-eyebrow mb-2">军机处结论</div>
            {reply.dossier.councilReview ? (
              <>
                <p className="text-xs leading-5 text-[#C8CDD8]">{reply.dossier.councilReview.recommendation}</p>
                <DossierList title="未决冲突" items={reply.dossier.councilReview.unresolved_conflicts} />
              </>
            ) : (
              <p className="text-xs text-[#626B8B]">本案未进入军机处会审</p>
            )}
          </div>

          <div className="rounded border border-[#F0C66A]/10 px-3 py-2">
            <div className="page-eyebrow mb-2">Agent 贡献</div>
            {reply.dossier.agentContributions?.status === 'AVAILABLE' ? (
              <ul className="space-y-1 text-xs leading-5 text-[#AEB5CB]">
                {reply.dossier.agentContributions.contributions.map((item) => (
                  <li key={item.agent_id}>· {item.agent_id}：{item.summary}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-5 text-[#F5A524]">
                UNAVAILABLE · {reply.dossier.agentContributions?.unavailable_reason ?? '后端未提供权威 Agent 贡献归因'}
              </p>
            )}
          </div>

          <div className="rounded border border-[#F0C66A]/10 px-3 py-2">
            <div className="page-eyebrow mb-2">史馆封存</div>
            {reply.dossier.archiveRef?.status === 'SEALED' ? (
              <p className="text-xs leading-5 text-[#3DD68C]">
                已封存 · {reply.dossier.archiveRef.ref}
              </p>
            ) : (
              <p className="text-xs leading-5 text-[#8F98B8]">尚未封存</p>
            )}
          </div>

          <DossierList title="分歧" items={reply.dossier.disagreements} />
          <DossierList title="未知事项" items={reply.dossier.unknowns} />
          <DossierList title="残余风险" items={reply.dossier.residualRisks} />
          <DossierList title="待圣裁事项" items={reply.dossier.mattersForImperialDecision} />
          <DossierList title="全局证据索引" items={reply.dossier.evidenceRefs} />
          <DossierList title="前瞻简报" items={reply.dossier.foresightBriefRefs} />
          <DossierList title="替代方案" items={reply.dossier.alternatives} />
          <div className="rounded border border-[#F0C66A]/10 px-3 py-2">
            <div className="page-eyebrow mb-2">运行标识</div>
            <dl className="space-y-1 text-xs text-[#AEB5CB]">
              <DossierMeta label="任务" value={reply.dossier.missionId ?? '未提供'} />
              <DossierMeta label="真实性" value={reply.dossier.truthLabel} />
              <DossierMeta label="风险" value={reply.dossier.riskLevel} />
              <DossierMeta label="不确定性" value={reply.dossier.uncertaintyLevel} />
            </dl>
          </div>
        </div>
      </details>
    </section>
  );
}

const TOPIC_PATTERN = {
  ticket: /票|ticket|座位|hospitality|availability|价格/i,
  itinerary: /行程|交通|住宿|航班|赛程|时间|地点|travel|hotel|flight|schedule/i,
  visa: /签证|入境|护照|visa|immigration|passport/i,
} as const;

function TravelDecisionBrief({ reply }: { reply: ChancellorReplyViewModel }) {
  const topicCriteria = (pattern: RegExp) => reply.criteria.filter((item) => (
    pattern.test(`${item.criterion} ${item.verifierFindings.join(' ')}`)
  ));
  const tickets = topicCriteria(TOPIC_PATTERN.ticket);
  const itinerary = topicCriteria(TOPIC_PATTERN.itinerary);
  const visas = topicCriteria(TOPIC_PATTERN.visa);

  return (
    <GlassPanel padding="md" variant="gold" hudCorners>
      <div className="mb-3">
        <div className="section-title">观赛决策简报</div>
        <p className="page-meta mt-1">只提供信息与办理计划；不下单、不锁座、不付款</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2" data-testid="travel-decision-brief">
        <DecisionBriefCard
          icon={TicketCheck}
          title="票务实况"
          items={topicLines(tickets)}
          empty="尚未取得带时间戳和来源的票务实况。"
          testId="ticket-intelligence"
        />
        <DecisionBriefCard
          icon={MapPinned}
          title="行程计划"
          items={topicLines(itinerary, reply.dossier.objective)}
          empty="尚未形成可执行行程。"
          testId="itinerary-plan"
        />
        <DecisionBriefCard
          icon={WalletCards}
          title="预算"
          items={recordLines(reply.dossier.budgetAndTimeline)}
          empty="尚未形成预算与时间边界。"
          testId="budget-plan"
        />
        <DecisionBriefCard
          icon={Stamp}
          title="签证与入境办理"
          items={topicLines(visas)}
          empty="尚未形成签证与入境办理清单；不得把缺失信息视为无需签证。"
          testId="visa-plan"
        />
      </div>
    </GlassPanel>
  );
}

function topicLines(
  criteria: readonly ChancellorCriterionView[],
  lead: string | null = null,
): string[] {
  return [
    ...(lead ? [lead] : []),
    ...criteria.flatMap((item) => [
      `${STATUS_PRESENTATION[item.status].label.replace('后端判定 · ', '')}：${item.criterion}`,
      ...item.verifierFindings,
      ...(item.gap ? [`待办：${item.gap}`] : []),
    ]),
  ];
}

function recordLines(value: Readonly<Record<string, unknown>>): string[] {
  return Object.entries(value).map(([key, item]) => {
    const rendered = typeof item === 'string' || typeof item === 'number'
      ? String(item)
      : JSON.stringify(item);
    return `${key}：${rendered}`;
  });
}

function DecisionBriefCard({
  icon: Icon,
  title,
  items,
  empty,
  testId,
}: {
  icon: typeof TicketCheck;
  title: string;
  items: readonly string[];
  empty: string;
  testId: string;
}) {
  return (
    <section className="rounded border border-[#F0C66A]/12 bg-[#070A14]/70 px-4 py-3" data-testid={testId}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#E8D7A8]">
        <Icon size={15} />
        {title}
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1 text-xs leading-5 text-[#AEB5CB]">
          {items.map((item, index) => <li key={`${index}-${item}`}>· {item}</li>)}
        </ul>
      ) : (
        <p className="text-xs leading-5 text-[#F5A524]">{empty}</p>
      )}
    </section>
  );
}

function CriterionRow({ criterion }: { criterion: ChancellorCriterionView }) {
  const status = STATUS_PRESENTATION[criterion.status];
  const Icon = status.icon;

  return (
    <article className="rounded-lg border border-[#F0C66A]/12 bg-[#070A14]/70 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-6 text-[#EAEEFB]">{criterion.criterion}</div>
          <div className="mt-0.5 font-mono text-[10px] text-[#626B8B]">{criterion.id}</div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-[10px] font-semibold"
          style={{ color: status.color, borderColor: `${status.color}45`, background: `${status.color}10` }}
        >
          <Icon size={12} />
          {status.label}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_0.75fr]">
        <div>
          <div className="page-eyebrow mb-1">证据</div>
          {criterion.evidence.length > 0 ? (
            <ul className="space-y-1">
              {criterion.evidence.map((evidence) => (
                <li key={`${evidence.kind}-${evidence.ref}`} className="flex min-w-0 gap-2 text-xs text-[#AEB5CB]">
                  <span className="shrink-0 text-[#8F835F]">{EVIDENCE_LABEL[evidence.kind]}</span>
                  <span className="break-all font-mono text-[10px]">{evidence.ref}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#F5A524]">后端未提供该项证据。</p>
          )}
        </div>
        <div>
          <div className="page-eyebrow mb-1">缺口 / 下一动作</div>
          <p className="text-xs leading-5 text-[#C8CDD8]">{criterion.gap ?? '后端未列出缺口。'}</p>
          {criterion.verifierFindings.length > 0 && (
            <ul className="mt-2 space-y-1 border-l border-[#7EC8E3]/25 pl-2 text-[11px] leading-5 text-[#9EC9D9]">
              {criterion.verifierFindings.map((finding) => <li key={finding}>{finding}</li>)}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function DossierList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded border border-[#F0C66A]/10 px-3 py-2">
      <div className="page-eyebrow mb-2">{title}</div>
      {items.length > 0 ? (
        <ul className="space-y-1 text-xs leading-5 text-[#AEB5CB]">
          {items.map((item) => <li key={item}>· {item}</li>)}
        </ul>
      ) : (
        <p className="text-xs text-[#626B8B]">后端未列出</p>
      )}
    </div>
  );
}

function DossierMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#626B8B]">{label}</dt>
      <dd className="text-right font-mono">{value}</dd>
    </div>
  );
}
