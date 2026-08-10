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
        {/* 金色龙形图标 - 与icon.svg一致 */}
        <svg viewBox="0 0 130 55" className="h-7 w-7" fill="none">
          <defs>
            <linearGradient id="nav-g" x1="0" y1="0" x2="130" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#F5D98C"/>
              <stop offset=".45" stop-color="#F0C66A"/>
              <stop offset="1" stop-color="#B88934"/>
            </linearGradient>
          </defs>
          <path fill="url(#nav-g)" d="M44 10C46 8 48 8 48 11 48 13 46 14 44 13Z M41 11C38 12 36 13 36 15 36 18 40 18 42 16Z M42 14C44 13 46 13 46 15 46 17 44 18 42 17Z M32 15C30 17 28 20 28 23 28 26 30 28 33 27L33 27C35 26 36 24 36 22 36 19 35 17 33 16Z M36 12C38 11 40 11 42 13L42 13C42 15 40 16 38 15 36 14 36 13 36 12Z M44 10C46 9 48 9 48 11L48 11C48 14 46 15 44 14 42 13 42 11 44 10Z M36 17C34 18 30 20 28 23L28 23C28 25 30 27 33 26L33 26C35 25 37 23 37 20 37 18 36 17 36 17Z M40 12C42 11 44 11 45 13L45 13C45 15 43 16 41 15 39 14 39 13 40 12Z M48 26C52 20 58 18 66 19L66 19C70 19 72 22 72 25L72 25C72 27 70 28 66 27 60 26 54 27 50 30 46 33 44 37 44 39L44 39C44 41 46 42 48 41L48 41C50 40 50 38 48 37L48 37C46 38 44 37 44 35L44 35C44 33 46 31 48 30L48 30C52 28 58 27 64 28L64 28C68 28 70 26 70 24L70 24C70 22 68 20 64 20 58 20 52 22 48 26Z M72 19C80 18 90 19 100 21L100 21C108 23 114 24 118 23L118 23C120 22 122 22 122 24L122 24C122 26 120 27 118 26L118 26C114 27 108 26 100 24 90 22 80 21 72 22L72 22C70 22 70 20 72 19Z M44 39C42 40 38 41 35 41L35 41C32 41 30 40 30 38L30 38C30 36 32 35 35 36L35 36C37 36 39 37 40 38L40 38C42 39 44 39 44 39Z M35 41C33 42 30 42 28 41L28 41C26 40 26 38 28 37L28 37C30 36 32 37 33 38L33 38C34 39 35 40 35 41Z M28 41C26 42 24 42 23 40L23 40C22 38 23 36 25 36L25 36C27 36 28 37 28 39L28 39C28 40 28 41 28 41Z M48 26C50 24 52 23 54 23L54 23C56 23 58 24 58 26L58 26C58 28 56 29 54 28L54 28C52 27 50 28 48 30L48 30C46 32 46 34 48 35L48 35C50 36 52 35 52 33L52 33C52 31 50 30 48 30Z M66 19C68 18 70 18 70 20L70 20C70 22 68 23 66 22L66 22C64 21 64 20 66 19Z"/>
          <path fill="url(#nav-g)" d="M40 8C38 5 40 3 43 4 45 5 44 8 42 9Z M44 7C43 4 45 2 47 3 49 4 48 7 46 8Z"/>
          <path stroke="url(#nav-g)" strokeWidth="1.2" strokeLinecap="round" fill="none" d="M48 11C52 10 54 12 52 15 M47 12C50 11 52 13 50 16"/>
          <circle cx="43" cy="13" r="1.5" fill="#F5D98C"/>
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
