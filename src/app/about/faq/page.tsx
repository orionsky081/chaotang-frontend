'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowLeft, Search } from 'lucide-react';

const FAQS = [
  {
    category: '产品定位',
    items: [
      {
        q: 'CourtOS 是法律咨询 AI 吗？它和问律师有什么区别？',
        a: 'CourtOS 不替代律师，它是法务团队的研判辅助工具。律师给法律建议，CourtOS 帮你在约律师之前快速整理清楚：这个问题是什么类型？风险有多高？今天必须做什么？\n\n区别在于：律师给结论，CourtOS 给结构。当你拿着一份结构清晰的初步研判去见律师，沟通效率会高出一个量级。',
      },
      {
        q: '和市面上的法律 AI SaaS 相比，核心差异是什么？',
        a: '三个差异：\n\n① 多 Agent 协同：不是单轮问答，是多个专业 AI 并行分析，结果汇总后互相校验\n② 结构化呈报：输出的是可操作的报告（风险清单 + 行动卡 + 法条引用），不是一段话\n③ 历史沉淀：每次研判自动归档，下次遇到相似案例系统会主动匹配，不是从零开始',
      },
      {
        q: 'CourtOS 能处理哪些类型的法务问题？',
        a: 'Beta 0.1 首发场景（LCR-001）专注于企业合同风险研判，包括：合同违约纠纷（供应商拒付、买方违约等）、合同条款风险排查（签约前审查）、仲裁前风险评估。\n\n路线图中的后续场景：HR 劳动纠纷（EXP-004）、监管合规询问、知识产权纠纷。',
      },
    ],
  },
  {
    category: '数据安全',
    items: [
      {
        q: '我的合同内容会被用来训练 AI 吗？',
        a: '不会。Beta 期间所有输入数据仅用于本次分析，不用于模型训练，不跨租户共享。\n\n私有化部署版本可做到数据完全不离开客户内网，包括 LLM 调用也走私有化模型。',
      },
      {
        q: '数据加密和访问控制如何实现？',
        a: '公有云版本：传输层 TLS 1.3 加密，存储层 AES-256 加密，访问日志全量留存。\n\n私有化版本（Beta 后期）：完全在客户内网，支持对接企业 SSO（SAML/OIDC），满足等保 2.0 要求。',
      },
      {
        q: '审计日志在哪里？',
        a: 'Settings → 操作日志页面（Beta 0.1 已上线）。记录每次指令提交、报告查看、账户切换等操作，支持按时间分页查看。',
      },
    ],
  },
  {
    category: '技术实现',
    items: [
      {
        q: 'AI 给出的法条引用准确吗？会不会"幻觉"？',
        a: '法条检索基于民法典（2021 版）、仲裁法等核心法律文本的精调索引，不是凭空生成。\n\n每条引用都附有原文出处，你可以直接核验。当前内测准确率约 92%，剩余 8% 主要出现在法条适用边界模糊的情形，这类情况会在呈报中标注"建议律师确认"。',
      },
      {
        q: '多 Agent 并行时，如果各个 Agent 结论矛盾怎么处理？',
        a: '丞相层在汇总时会做矛盾检测：若分歧在阈值内，选置信度较高的 Agent 结论；若分歧超出阈值，会在呈报中标注"结论存在分歧，建议人工审核"；行动建议冲突时，会并列展示两种方案及各自适用条件。',
      },
      {
        q: '响应时间多长？',
        a: '标准 LCR-001 场景（合同争议研判）：丞相分析 + 任务分配约 3-5 秒，多 Agent 并行分析约 20-40 秒，报告生成约 5-10 秒。全程通常在 60 秒内完成；本地体验环境通常更快。',
      },
    ],
  },
  {
    category: '试点和定价',
    items: [
      {
        q: 'Beta 试点需要什么条件？费用是多少？',
        a: 'Beta 0.1 试点是免费邀请制，接受满足以下条件的企业：\n\n· 月均法务需求量 ≥ 20 件\n· 有内部法务团队（3-10 人）\n· 愿意在 30 天试点期内提供使用反馈（每两周 30 分钟沟通）\n\n试点结束后，我们会根据反馈调整产品，再讨论正式定价方案。申请渠道：pilot@courtos.ai',
      },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1A2142] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
      >
        <span className="text-[13px] font-medium text-[#EAEEFB]">{q}</span>
        <ChevronDown
          size={14}
          className={`mt-0.5 shrink-0 text-[#6A7299] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="pb-4">
          {a.split('\n\n').map((para, i) => (
            <p key={i} className="mb-3 text-[13px] leading-[1.7] text-[#9AA3C4] last:mb-0">
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? FAQS.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.q.toLowerCase().includes(query.toLowerCase()) ||
            item.a.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter((cat) => cat.items.length > 0)
    : FAQS;

  return (
    <div className="min-h-screen bg-[#04060E] text-[#EAEEFB]">
      <div className="mx-auto max-w-2xl px-6 py-16">

        <Link
          href="/about"
          className="mb-8 inline-flex items-center gap-2 text-[12px] text-[#6A7299] transition hover:text-[#9AA3C4]"
        >
          <ArrowLeft size={12} />
          返回产品介绍
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-[#EAEEFB]">常见问题</h1>
        <p className="mb-8 text-[13px] text-[#6A7299]">CourtOS Beta 0.1</p>

        {/* Search */}
        <div className="relative mb-10">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484F72]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索问题..."
            className="w-full rounded-lg border border-[#1A2142] bg-[#0A0E1E] py-2.5 pl-8 pr-4 text-[13px] text-[#EAEEFB] placeholder-[#484F72] outline-none focus:border-[#2C3560]"
          />
        </div>

        {/* FAQ items */}
        {filtered.length === 0 ? (
          <p className="text-[13px] text-[#484F72]">没有找到相关问题。</p>
        ) : (
          <div className="space-y-10">
            {filtered.map((cat) => (
              <section key={cat.category}>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-[#484F72]">
                  {cat.category}
                </h2>
                <div className="rounded-xl border border-[#1A2142] bg-[#0A0E1E] px-5">
                  {cat.items.map((item) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 text-[12px] text-[#484F72]">
          还有其他问题？发邮件至{' '}
          <a href="mailto:pilot@courtos.ai" className="text-[#6A7299] transition hover:text-[#9AA3C4]">
            pilot@courtos.ai
          </a>
        </div>

      </div>
    </div>
  );
}
