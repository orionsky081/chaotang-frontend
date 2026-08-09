'use client';

/**
 * OfficeRail — 六部大厅左右常驻「户部 · OFFICE RAIL」侧栏（设计稿核心缺口）。
 *
 * 左栏「账册与风险」、右栏「预算与验收」，各 3 条条目卡（复用 .rail-panel 深色侧栏卡）。
 * 每条 = 序号 + 小标签 + 标题 + 一句说明。纯视觉展示卡（pointer-events-none）。
 */

const GOLD = '#F0C66A';
const CREAM = '#F5E9C9';

export interface OfficeRailItemData {
  tag: string;
  title: string;
  desc: string;
}

export interface OfficeRailProps {
  align: 'left' | 'right';
  /** 副标题：左=账册与风险 / 右=预算与验收 */
  subTitle: string;
  items: OfficeRailItemData[];
}

/** 户部左栏（账册与风险） */
export const HUBU_LEFT_RAIL: OfficeRailItemData[] = [
  {
    tag: '账期',
    title: '现金流任务',
    desc: '看本周付款、回款和预算占用，先排高压事项。',
  },
  {
    tag: '底线',
    title: '报价底线',
    desc: '报价必须带毛利、交付成本和不可退让条件。',
  },
  {
    tag: '补证',
    title: '缺证金额',
    desc: '客户规模、合同条款、供应报价缺一项不准拍板。',
  },
];

/** 户部右栏（预算与验收） */
export const HUBU_RIGHT_RAIL: OfficeRailItemData[] = [
  {
    tag: '测验',
    title: '户部裁断',
    desc: '值不值得花钱，先看账本再下旨。',
  },
  {
    tag: '回写',
    title: '资金验收',
    desc: '每笔动作要有预算来源、责任人和回写口。',
  },
  {
    tag: '归档',
    title: '入史凭据',
    desc: '报价单、付款凭据、审批轨迹统一归档。',
  },
];

export function OfficeRail({ align, subTitle, items }: OfficeRailProps) {
  return (
    <aside
      data-office-rail={align}
      className={`pointer-events-none fixed top-[150px] z-[40] hidden w-[252px] xl:block 2xl:w-[286px] ${
        align === 'left' ? 'left-4' : 'right-4'
      }`}
      aria-label={`户部 · ${subTitle}`}
    >
      <div
        className="rail-panel relative overflow-hidden px-3 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,250,232,0.07)] backdrop-blur-xl"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,11,18,0.88), rgba(5,7,13,0.74)), radial-gradient(circle at 50% -12%, rgba(240,198,106,0.12), transparent 46%)',
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-4 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}99, transparent)` }}
        />
        {/* 头部 */}
        <div className={`text-[9px] font-bold uppercase tracking-[0.20em] ${align === 'right' ? 'text-right' : ''}`} style={{ color: GOLD }}>
          户部 · OFFICE RAIL
        </div>
        <div className={`mt-1 flex items-end gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
          <span
            aria-hidden="true"
            className="mb-1 h-6 w-[3px] rounded-full"
            style={{ background: `linear-gradient(180deg, ${GOLD}, rgba(240,198,106,0.12))` }}
          />
          <span className="font-serif text-[16px] font-black leading-tight text-[#F5E9C9]">{subTitle}</span>
        </div>

        {/* 条目 */}
        <div className="relative mt-3 space-y-2">
          {items.slice(0, 3).map((item, index) => (
            <div
              key={item.title}
              className={`relative overflow-hidden rounded-[8px] border px-2.5 py-2 ${
                align === 'right' ? 'text-right' : ''
              }`}
              style={{
                borderColor: 'rgba(240,198,106,0.14)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025)), radial-gradient(circle at 0% 0%, rgba(240,198,106,0.08), transparent 42%)',
                boxShadow: 'inset 0 1px 0 rgba(255,250,232,0.05)',
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
              />
              <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                <span
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded border font-mono text-[10px] font-bold"
                  style={{ color: GOLD, borderColor: `${GOLD}30`, background: `${GOLD}10` }}
                >
                  0{index + 1}
                </span>
                <span
                  className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-[#8F835F]"
                  style={{ color: '#8F835F' }}
                >
                  {item.tag}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#F5E9C9]" style={{ color: CREAM }}>
                {item.title}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-[#9AA3C4]">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
