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
        {/* 金色龙形剪影图标 */}
        <svg viewBox="0 0 512 512" className="h-7 w-7" fill="none">
          <defs>
            <linearGradient id="nav-gold" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#F5D98C"/>
              <stop offset=".5" stop-color="#F0C66A"/>
              <stop offset="1" stop-color="#B88934"/>
            </linearGradient>
          </defs>
          <path fill="url(#nav-gold)" d="M280 58C340 52 400 80 440 130c35 42 50 95 48 145-2 55-23 105-58 140-35 33-80 50-125 53-15 2-27-10-25-25 2-15 14-25 29-27 39-4 73-18 99-44 30-30 44-70 42-112-2-42-18-80-45-108-30-32-70-52-115-47-30 3-50 20-60 45-12 30-10 65 5 95 15 30 40 50 70 60 25 8 40 25 35 47-5 18-25 28-45 23-25-7-37-30-27-53 4-10-6-18-16-14-17 7-27 27-22 50 8 32 35 52 68 57 32 5 60-10 72-35 15-32 2-70-25-90-30-22-67-38-87-65-23-30-28-67-18-97 13-40 45-70 85-86 15-7 28-12 40-14 35-4 65 4 85 22 20 18 33 42 37 70 2 12 13 20 25 16 11-4 15-16 11-28-10-38-33-73-68-98C362 32 315 22 270 28c-35 5-65 24-85 54-25 38-33 86-23 133 8 37 30 67 58 90-20-10-42-27-55-50-17-30-20-65-10-97 13-40 45-70 85-86 15-7 28-12 40-14zM175 55c-10-15-7-30 5-37 8-4 15 0 15 10 0 7-7 17-17 24zm20-10c-5-13 3-25 15-27 8-1 12 4 10 12-2 8-10 15-20 18z"/>
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
