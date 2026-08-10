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
        <svg viewBox="0 0 110 38" className="h-7 w-7" fill="none">
          <defs>
            <linearGradient id="nav-g" x1="0" y1="0" x2="110" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#F5D98C"/>
              <stop offset=".4" stop-color="#F0C66A"/>
              <stop offset="1" stop-color="#B88934"/>
            </linearGradient>
          </defs>
          <path fill="url(#nav-g)" d="M22 1C23 0 26 0 27 1L27 1C28 2 27 3 25 3L25 3C23 3 22 2 22 1Z M18 1C17 1 17 2 18 3L18 3C19 4 20 3 20 2L20 2C20 1 19 1 18 1Z M24 3C26 2 28 2 28 4L28 4C28 6 26 6 24 5L24 5C23 4 23 3 24 3Z M15 3C14 4 14 5 15 6L15 6C16 7 17 6 17 5L17 5C17 4 16 3 15 3Z M13 5C12 6 12 8 13 9L13 9C14 10 15 9 15 8L15 8C15 6 14 5 13 5Z M28 5C30 4 32 4 34 5L34 5C40 7 46 8 52 8L52 8C58 8 64 7 70 5L70 5C76 3 82 3 88 5L88 5C92 7 95 9 96 12L96 12C97 15 96 18 93 20L93 20C90 22 86 23 82 22L82 22C76 21 70 22 66 25L66 25C62 28 60 32 60 34L60 34C60 35 61 36 62 35L62 35C63 34 63 32 62 30L62 30C61 28 62 26 64 25L64 25C68 23 74 22 80 23L80 23C84 24 88 23 91 21L91 21C93 19 94 16 93 13L93 13C92 10 89 8 85 7L85 7C79 5 73 5 67 6L67 6C61 7 55 7 49 6L49 6C43 5 37 5 31 7L31 7C28 8 26 7 25 5L25 5C24 4 25 3 27 3Z M60 34C59 35 57 35 56 34L56 34C55 33 55 32 56 31L56 31C57 30 58 31 58 32L58 32C58 33 59 34 60 34Z M56 34C55 35 53 35 52 34L52 34C51 33 51 32 52 31L52 31C53 30 54 31 54 32L54 32C54 33 55 34 56 34Z M52 34C51 35 49 35 48 34L48 34C47 33 47 31 49 30L49 30C50 29 51 30 51 31L51 31C51 32 52 33 52 34Z M25 5C24 6 23 8 23 10L23 10C23 12 24 14 26 14L26 14C28 14 29 12 29 10L29 10C29 8 28 6 26 5Z M11 8C10 9 9 11 9 13L9 13C9 15 10 17 12 18L12 18C14 19 16 18 17 16L17 16C18 14 17 12 15 11L15 11C13 10 12 9 11 8Z M7 12C6 14 6 16 7 18L7 18C8 20 10 21 12 21L12 21C14 21 15 19 15 17L15 17C15 15 14 13 12 12L12 12C10 11 8 12 7 12Z M5 16C4 18 4 20 5 22L5 22C6 24 8 25 10 25L10 25C12 25 13 23 13 21L13 21C13 19 12 17 10 16L10 16C8 15 6 16 5 16Z M4 20C3 22 3 25 5 27L5 27C7 29 9 30 11 30L11 30C13 30 14 28 14 26L14 26C14 24 13 22 11 21L11 21C9 20 6 20 4 20Z M5 25C4 27 5 30 7 32L7 32C9 34 12 35 15 34L15 34C18 33 20 31 22 28L22 28C24 25 25 22 24 20L24 20C23 18 21 17 19 18L19 18C17 19 16 21 17 23L17 23C18 25 20 26 22 25L22 25C24 24 25 22 24 20Z M7 32C8 34 10 35 13 35L13 35C16 35 19 34 22 31L22 31C25 28 27 25 27 22L27 22C27 20 26 19 24 20L24 20C22 21 21 23 22 25L22 25C23 27 25 28 27 27L27 27C29 26 30 24 29 22L29 22C28 20 26 19 24 20Z M13 35C16 35 19 34 21 32L21 32C23 30 24 28 24 26L24 26C24 24 23 23 21 23L21 23C19 23 18 24 18 26L18 26C18 28 19 30 21 31L21 31C23 32 25 31 26 29L26 29C27 27 27 25 26 23L26 23C25 21 23 20 21 21L21 21C19 22 18 24 19 26L19 26C20 28 22 29 24 28L24 28C26 27 27 25 26 23Z M16 17C15 18 15 20 16 21L16 21C17 22 18 21 18 20L18 20C18 19 17 18 16 17Z M26 14C28 13 30 13 30 15L30 15C30 17 28 17 26 16L26 16C25 15 25 14 26 14Z M12 18C10 19 9 21 10 23L10 23C11 25 13 25 14 23L14 23C15 21 14 19 12 18Z"/>
          <path fill="url(#nav-g)" d="M20 0C19 -1 20 -2 21 -1L21 -1C22 0 21 1 20 1Z M23 -1C22 -2 23 -3 24 -2L24 -2C25 -1 24 0 23 0Z"/>
          <circle cx="26" cy="3" r="1" fill="#F5D98C"/>
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
