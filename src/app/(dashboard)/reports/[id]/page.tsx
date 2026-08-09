/**
 * 朝堂 OS V2 · 报告详情
 *
 * 编辑阅读视图：sticky TOC + 分节渲染 + 打印样式 + 导出栏
 */

'use client';

import Link from 'next/link';
import { use } from 'react';
import useSWR from 'swr';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ExportDock, ReportHero, ReportSectionRenderer, ReportToc } from '@/features/reports';
import { api } from '@/lib/api/clients/reports';
import type { Report } from '@/types/report';

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: report, error, isLoading, mutate } = useSWR<Report, Error>(
    `backend-report:${id}`,
    () => api.reports.getById(id),
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-[#6A7299]">
        加载报告中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-[12px] text-[#F43F5E]">
        <div>后端报告加载失败: {error.message}</div>
        <button
          type="button"
          onClick={() => void mutate()}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-[#EAEEFB] hover:bg-white/5"
        >
          重试
        </button>
      </div>
    );
  }

  if (!report) return null;

  const orderedSections = [...report.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full overflow-y-auto">
      <PrintStyles />
      <div className="mx-auto max-w-[1280px] p-6">
        <div className="mb-6">
          <ReportHero report={report} />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sticky TOC rail */}
          <aside className="col-span-12 print:hidden lg:col-span-3">
            <div className="lg:sticky lg:top-6">
              <ReportToc sections={orderedSections} />
            </div>
          </aside>

          {/* Reading column */}
          <main className="col-span-12 lg:col-span-9">
            <GlassPanel
              tone="elevated"
              padding="lg"
              className="mb-6 overflow-hidden"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="section-eyebrow">礼部定稿</span>
                <span className="page-meta">正式文书 · 适合批示、会签、演示与继续流转</span>
              </div>
              <div className="max-w-[760px] space-y-4">
                <h2 className="section-title text-[22px] tracking-[0.04em]">
                  这份卷宗已经整理成可以直接呈到御前的正式版本。
                </h2>
                <p className="body-copy text-[14px] leading-8 text-[#B8C0DA]">
                  阅读时先看章节结论和批示依据，再决定是切到演示、送去三省审议台，还是回到来源任务继续推进。
                  过程噪音已经退到侧栏与尾部，正文只保留正式表达。
                </p>
              </div>
            </GlassPanel>

            <GlassPanel tone="deep" padding="lg" className="mb-6 overflow-hidden">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="section-eyebrow">去向建议</span>
                <span className="page-meta">礼部文书不止可读，还应继续流转</span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <ActionTile
                  title="进入演示"
                  body="当需要路演、汇报或对外呈现时，直接切到演示。"
                  href={`/present/${report.id}`}
                  label="去演示"
                />
                <ActionTile
                  title="去三省审议台"
                  body="当事项还需拍板、会签或形成下发动作时，继续进入治理流。"
                  href="/governance"
                  label="去审议"
                />
                <ActionTile
                  title="回来源任务"
                  body="当文书还需补强依据或继续推进执行时，回到军机处继续处理。"
                  href={report.taskId ? `/command-center/${report.taskId}` : '/command-center'}
                  label="回军机处"
                />
              </div>
            </GlassPanel>

            <div className="report-print-area space-y-6">
              {orderedSections.map((section, i) => (
                <GlassPanel
                  key={section.id}
                  id={`section-${section.id}`}
                  tone="elevated"
                  padding="lg"
                  className="report-section scroll-mt-24 overflow-hidden"
                >
                  <div
                    className="mb-5 flex items-baseline gap-3 border-b pb-4"
                    style={{ borderColor: 'rgba(240, 198, 106, 0.2)' }}
                  >
                    <span className="font-mono text-[10px] tracking-[0.24em] text-[#CBA24F]">
                      §{String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="section-title text-[20px] leading-snug tracking-[0.03em]">
                      {section.title}
                    </h2>
                  </div>
                  <ReportSectionRenderer section={section} variant="detail" />
                </GlassPanel>
              ))}
            </div>

            <div className="mt-8 print:hidden">
              <ExportDock report={report} />
            </div>
          </main>
        </div>

        <div
          className="mt-10 border-t py-5 text-center text-[9px] tracking-[0.34em] text-[#484F72] print:hidden"
          style={{ borderColor: 'rgba(26, 33, 66, 0.4)' }}
        >
          — 丞相府 · 奉天承运 —
        </div>
      </div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body {
          background: white !important;
          color: black !important;
        }
        .report-section {
          page-break-inside: avoid;
          break-inside: avoid;
          page-break-after: always;
          break-after: page;
          border: none !important;
          background: white !important;
          box-shadow: none !important;
        }
        .report-section h2,
        .report-section span,
        .report-section * {
          color: black !important;
        }
        .report-print-area {
          max-width: none !important;
        }
        aside,
        nav,
        button {
          display: none !important;
        }
      }
    `}</style>
  );
}

function ActionTile({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <GlassPanel tone="flat" padding="md" className="h-full">
      <div className="flex h-full flex-col">
        <div className="text-[12px] font-semibold text-[#F5E9C9]">{title}</div>
        <p className="mt-2 text-[12px] leading-6 text-[#AEB7D1]">{body}</p>
        <Link
          href={href}
          className="mt-auto pt-4 text-[11px] font-medium text-[#F0C66A] hover:text-[#F5E9C9]"
        >
          {label} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </GlassPanel>
  );
}
