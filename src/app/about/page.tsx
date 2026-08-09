import Link from 'next/link';
import { ArrowRight, Shield, Zap, Archive, FileText } from 'lucide-react';

export const metadata = {
  title: 'CourtOS · 企业 AI 法务治理系统',
  description:
    'CourtOS 是面向企业复杂法务决策的多角色 AI 治理系统，把合同风险研判从 1-2 天压缩到 5 分钟。',
};

const DIFFERENTIATORS = [
  {
    icon: Zap,
    title: '多 Agent 协同',
    body: '法务、合规、HR 庄园并行运行，各自输出专业意见，汇总成一份完整报告。不是单轮问答，是结构化分析流程。',
  },
  {
    icon: Archive,
    title: '结构化呈报沉淀',
    body: '每次研判结果自动归档到史馆，包含风险清单、行动卡、引用法条，可一键导出 PDF 直接发给老板或律师。',
  },
  {
    icon: Shield,
    title: '历史案例可召回',
    body: '下次遇到相似合同争议，系统自动匹配历史案例，告诉你上次怎么处理的、结果是什么。',
  },
];

const COMPARISON = [
  { label: '初步研判时间', before: '1-2 天等律师', after: '5 分钟内完成' },
  { label: '结果交付方式', before: '散落在邮件里', after: '结构化呈报 + 归档' },
  { label: '每次起点', before: '从零开始整理', after: '自动匹配历史案例' },
  { label: '协作方式', before: '多人来回邮件', after: '多 AI Agent 并行' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#04060E] text-[#EAEEFB]">
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Hero */}
        <div className="mb-16">
          <div className="mb-4 inline-block rounded-full border border-[#D4A84B]/30 bg-[#D4A84B]/[0.06] px-3 py-1 text-[11px] font-medium text-[#D4A84B]">
            Beta 0.1 · 邀请制试点
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#EAEEFB]">
            CourtOS
          </h1>
          <p className="text-lg leading-relaxed text-[#9AA3C4]">
            面向企业复杂法务决策的多角色 AI 治理系统。<br />
            把合同风险研判从 1-2 天压缩到 5 分钟。
          </p>
        </div>

        {/* Problem */}
        <section className="mb-16">
          <h2 className="mb-6 text-lg font-semibold text-[#EAEEFB]">问题</h2>
          <p className="mb-4 text-[14px] leading-[1.8] text-[#9AA3C4]">
            企业法务团队每天面对数十份合同、劳动纠纷、监管询问，每一件都需要：检索相关法条和先例案例、协调多个部门（法务 + 合规 + 财务）、形成结构化的决策建议。
          </p>
          <p className="text-[14px] leading-[1.8] text-[#9AA3C4]">
            传统方式：1-2 天、多人协作、结果散落在邮件里。
          </p>
        </section>

        {/* Solution flow */}
        <section className="mb-16">
          <h2 className="mb-6 text-lg font-semibold text-[#EAEEFB]">解决方案</h2>
          <div className="mb-8 rounded-xl border border-[#1A2142] bg-[#0A0E1E] px-6 py-4">
            <p className="font-mono text-[13px] text-[#6A7299]">
              你的指令
              <span className="mx-2 text-[#D4A84B]">→</span>
              丞相 AI（研判 + 分配）
              <span className="mx-2 text-[#D4A84B]">→</span>
              多庄园并行分析
              <span className="mx-2 text-[#D4A84B]">→</span>
              结构化呈报
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="rounded-xl border border-[#1A2142] bg-[#0A0E1E] p-5">
                <d.icon size={16} className="mb-3 text-[#D4A84B]" />
                <h3 className="mb-2 text-[13px] font-semibold text-[#EAEEFB]">{d.title}</h3>
                <p className="text-[12px] leading-[1.7] text-[#6A7299]">{d.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="mb-16">
          <h2 className="mb-6 text-lg font-semibold text-[#EAEEFB]">价值主张</h2>
          <div className="overflow-hidden rounded-xl border border-[#1A2142]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#1A2142] bg-[#0A0E1E]">
                  <th className="px-5 py-3 text-left font-medium text-[#6A7299]"></th>
                  <th className="px-5 py-3 text-left font-medium text-[#6A7299]">传统方式</th>
                  <th className="px-5 py-3 text-left font-medium text-[#D4A84B]">CourtOS</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-[#1A2142] last:border-0 ${i % 2 === 0 ? 'bg-[#04060E]' : 'bg-[#0A0E1E]'}`}
                  >
                    <td className="px-5 py-3 text-[#9AA3C4]">{row.label}</td>
                    <td className="px-5 py-3 text-[#484F72]">{row.before}</td>
                    <td className="px-5 py-3 text-[#EAEEFB]">{row.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* First scenario */}
        <section className="mb-16">
          <h2 className="mb-2 text-lg font-semibold text-[#EAEEFB]">
            首发场景：LCR-001 企业合同风险研判
          </h2>
          <p className="mb-4 text-[13px] text-[#6A7299]">
            输入一段合同争议描述，5 分钟内输出：
          </p>
          <ul className="space-y-2">
            {[
              '律师研判摘要',
              '高 / 中 / 低风险清单（含应对建议）',
              '立即行动 / 本周处理 / 紧急处置的分类行动卡',
              '引用相关法条（民法典、仲裁法等）',
              '相似历史案例比对',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-[#9AA3C4]">
                <span className="mt-[3px] text-[#D4A84B]">·</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="mb-12 rounded-xl border border-[#D4A84B]/20 bg-[#D4A84B]/[0.04] p-6">
          <div className="mb-2 text-[13px] font-semibold text-[#D4A84B]">申请试点</div>
          <p className="mb-4 text-[13px] leading-[1.7] text-[#9AA3C4]">
            目前处于 Beta 0.1 阶段，接受月均法务需求量 ≥ 20 件、有内部法务团队（3-10 人）的企业申请。30 天免费试点。
          </p>
          <a
            href="mailto:pilot@courtos.ai"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#D4A84B] transition hover:opacity-80"
          >
            pilot@courtos.ai
            <ArrowRight size={13} />
          </a>
        </section>

        {/* Footer links */}
        <div className="flex items-center gap-6 text-[12px] text-[#484F72]">
          <Link href="/about/faq" className="transition hover:text-[#9AA3C4]">
            常见问题
          </Link>
          <Link href="/throne" className="transition hover:text-[#9AA3C4]">
            进入系统
          </Link>
          <span>CourtOS Beta 0.1 · 上线目标 2026-05-22</span>
        </div>

      </div>
    </div>
  );
}
