'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, HelpCircle, LogOut } from 'lucide-react';
import { CORE_NAV, MANOR_NAV } from '../constants';

const NAV_ITEMS = [
  CORE_NAV[0], // 大殿
  CORE_NAV[1], // 上书房
  CORE_NAV[2], // 军机处
  { key: 'ministries', label: '六部', href: '/departments' },
  MANOR_NAV, // 庄园
  { key: 'offices', label: '专署', href: '/offices' },
  CORE_NAV[3], // 史馆
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/overview') return pathname === href;
  // 上书房特殊处理：/shangshufang 重定向到 /court-briefing
  if (href === '/shangshufang') return pathname === '/shangshufang' || pathname.startsWith('/court-briefing') || pathname.startsWith('/shangshufang');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ChaotangTopNav({
  onLogout,
  loggingOut = false,
  notifyCount = 0,
  onOpenResources,
}: {
  onLogout?: () => void;
  loggingOut?: boolean;
  notifyCount?: number;
  onOpenResources?: () => void;
}) {
  const pathname = usePathname() ?? '';
  const [clock, setClock] = useState('');
  const [ancientDate, setAncientDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }));
      // 古制干支年 + 农历月日（简化版）
      const heavenlyStems = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
      const earthlyBranches = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      const year = now.getFullYear();
      const stemIdx = (year - 4) % 10;
      const branchIdx = (year - 4) % 12;
      const ganZhiYear = `${heavenlyStems[stemIdx]}${earthlyBranches[branchIdx]}年`;
      const lunarMonths = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
      const lunarDays = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
      const month = now.getMonth();
      const day = now.getDate() - 1;
      setAncientDate(`${ganZhiYear}·${lunarMonths[month]}${lunarDays[Math.min(day, 29)]}`);
    };
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  const openHelp = () => {
    if (onOpenResources) onOpenResources();
    else window.dispatchEvent(new CustomEvent('court:open-help'));
  };

  return (
    <header className="relative z-50 flex h-11 items-center gap-4 border-b border-[rgba(192,170,120,0.2)] bg-[rgba(0,0,0,0.6)] px-4 backdrop-blur-xl lg:px-6">
      <Link href="/overview" className="flex shrink-0 items-center gap-2">
        {/* 金色圆形官印/鼎图标 */}
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
          {/* 圆形外框 */}
          <circle cx="16" cy="16" r="14" stroke="#F0C66A" strokeWidth="1.5" fill="none"/>
          {/* 内部抽象鼎/印章图案 */}
          <path d="M10 10h12v2H10zM11 12h10v6H11zM9 18h14v2H9zM12 20v3h8v-3" stroke="#F0C66A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          {/* 顶部帽翅装饰 */}
          <path d="M13 8c0-2 1.5-3 3-3s3 1 3 3" stroke="#F0C66A" strokeWidth="1" strokeLinecap="round" fill="none"/>
        </svg>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="font-serif text-[13px] font-bold tracking-[0.12em] text-[#F5E9C9]">朝堂OS</span>
          <span className="text-[8px] font-medium tracking-[0.28em] text-[#8A9BB8]">上值朝·AI 智能办公</span>
        </span>
      </Link>

      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="朝堂主导航">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative shrink-0 px-3 py-1.5 text-[13px] transition"
              style={{
                color: active ? '#F0C66A' : '#9AA3C4',
                fontWeight: active ? 700 : 400,
              }}
            >
              {item.label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full"
                  style={{ background: '#F0C66A' }}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <span className="hidden font-mono text-[10px] text-[#6A7299] md:inline">{clock}</span>
        <span className="hidden font-serif text-[10px] tracking-[0.18em] text-[#8A9BB8] lg:inline">{ancientDate}</span>
        <div className="hidden items-center gap-1.5 xl:flex">
          {['能力边界', '企业家', 'AI爱好者', 'AI极客'].map((t) => (
            <span key={t} className="rounded-full border border-[#F0C66A]/30 bg-[#F0C66A]/[0.06] px-2.5 py-1 text-[10px] leading-none tracking-[0.06em] text-[#D8C99A] transition hover:border-[#F0C66A]/50 hover:bg-[#F0C66A]/[0.12] hover:text-[#F5E9C9]">{t}</span>
          ))}
        </div>
        <Link href="/throne/pulse" className="relative rounded-md p-2 text-[#9AA3C4] hover:bg-white/5 hover:text-[#F0C66A]" aria-label={`待处理 ${notifyCount} 项`}>
          <Bell size={15} />
          {notifyCount > 0 ? <span className="absolute right-0.5 top-0.5 min-w-3 rounded-full bg-[#F43F5E] px-1 text-center text-[8px] leading-3 text-white">{notifyCount}</span> : null}
        </Link>
        <button type="button" onClick={openHelp} className="rounded-md p-2 text-[#9AA3C4] hover:bg-white/5 hover:text-[#F0C66A]" aria-label="帮助">
          <HelpCircle size={15} />
        </button>
        {onLogout ? (
          <button type="button" onClick={onLogout} disabled={loggingOut} className="rounded-md p-2 text-[#9AA3C4] hover:bg-white/5 hover:text-[#F43F5E] disabled:opacity-40" aria-label="退出登录">
            <LogOut size={15} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
