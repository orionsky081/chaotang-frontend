'use client';

import Link from 'next/link';
import { FileText, Shield, Stamp } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { BillsBoard, DeliberationConsole } from '@/features/governance';
import { SurfaceBridgePanel } from '@/features/shared/components/surface-bridge-panel';
import { DeptIdentityStrip } from '@/features/shared/components/dept-identity-strip';

export default function GovernancePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1600px] px-6 pb-24 pt-6">
        <div className="space-y-6">
            <DeptIdentityStrip
              portrait="/heroes/character-roster/governance-wei-zheng.webp"
              name="门下侍中 · 魏征"
              tagline="三省治理流：中书起草、门下复核、尚书下发均由后端主库留痕（东宫旧路由现并入本页）"
              accent="#8AA4FF"
            />
            <GlassPanel variant="gold" tone="deep" padding="lg" hudCorners glow>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="page-eyebrow">Governance Flow · 三省治理流</div>
                  <h1 className="mt-3 max-w-[900px] text-[30px] font-semibold leading-[1.2] text-[#F6EFD8] md:text-[38px]">
                    前端只呈卷，后端负责起草、复核、状态转移与留痕。
                  </h1>
                  <p className="mt-4 max-w-[760px] text-[14px] leading-8 text-[#B6BDD5]">
                    祖训、议案、审议结论和合法动作均来自后端主库。浏览器不能自选身份、伪造时间，也不能跳过门下直接派发。
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link href="/throne/compose" className="rounded-full border border-[#F0C66A]/35 bg-[#F0C66A]/12 px-4 py-2 text-[11px] text-[#F0C66A] transition hover:bg-[#F0C66A]/18">
                      回军机处起稿
                    </Link>
                    <Link href="/manors" className="rounded-full border border-white/10 px-4 py-2 text-[11px] text-[#EAEEFB] transition hover:bg-white/5">
                      去庄园执行面
                    </Link>
                    <Link href="/governance/new" className="rounded-full border border-white/10 px-4 py-2 text-[11px] text-[#9AA3C4] transition hover:bg-white/5 hover:text-[#EAEEFB]">
                      新建议案
                    </Link>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <RuleLine icon={FileText} title="中书起草" body="旨意与案卷写入后端，由后端生成编号、时间与首帧。" />
                  <RuleLine icon={Shield} title="门下复核" body="祖训从后端读取；客户端不能随请求替换审议规则。" />
                  <RuleLine icon={Stamp} title="尚书下发" body="后端状态机只返回当前合法动作，历史帧带可复核哈希链。" />
                </div>
              </div>
            </GlassPanel>

            <BillsBoard />
            <DeliberationConsole />

            <SurfaceBridgePanel
              mode="backstage"
              frontstageHref="/overview"
              backstageHref="/manors"
              frontstageLabel="回大殿看总局"
              backstageLabel="去庄园执行面"
            />
        </div>
      </div>
    </div>
  );
}

function RuleLine({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[#F0C66A]">
        <Icon size={13} />
        {title}
      </div>
      <div className="mt-2 text-[11px] leading-6 text-[#9AA3C4]">{body}</div>
    </div>
  );
}
