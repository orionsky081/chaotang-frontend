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
        <svg viewBox="0 0 100 100" className="h-7 w-7" fill="none">
          <defs>
            <linearGradient id="nav-g" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#F5D98C"/>
              <stop offset="0.4" stop-color="#F0C66A"/>
              <stop offset="1" stop-color="#B88934"/>
            </linearGradient>
          </defs>
          <path fill="url(#nav-g)" d="M65.7,0.0 L65.7,0.0 L61.4,0.9 L59.5,1.9 L60.5,2.8 L57.0,3.7 L58.1,4.7 L57.3,5.6 L56.5,6.5 L54.3,7.4 L55.4,8.4 L54.9,9.3 L53.2,10.2 L50.3,11.2 L48.6,12.1 L49.7,13.0 L48.6,14.0 L45.9,14.9 L47.3,15.8 L44.3,16.7 L43.8,17.7 L42.7,18.6 L43.0,19.5 L42.2,20.5 L38.4,21.4 L39.7,22.3 L37.0,23.3 L35.1,24.2 L9.7,25.1 L9.7,26.0 L8.6,27.0 L9.7,27.9 L10.3,28.8 L10.5,29.8 L11.1,30.7 L11.6,31.6 L11.1,32.6 L13.2,33.5 L12.7,34.4 L13.8,35.3 L15.1,36.3 L20.3,37.2 L25.9,38.1 L25.1,39.1 L24.1,40.0 L6.8,40.9 L7.0,41.9 L4.1,42.8 L8.6,43.7 L8.1,44.7 L1.6,45.6 L0.5,46.5 L4.1,47.4 L4.3,48.4 L4.1,49.3 L5.4,50.2 L5.7,51.2 L4.3,52.1 L5.7,53.0 L6.5,54.0 L5.9,54.9 L8.4,55.8 L8.6,56.7 L8.6,57.7 L8.9,58.6 L9.2,59.5 L9.2,60.5 L5.1,61.4 L8.9,62.3 L5.9,63.3 L6.8,64.2 L6.2,65.1 L13.2,66.0 L13.5,67.0 L12.4,67.9 L13.0,68.8 L15.7,69.8 L17.6,70.7 L21.9,71.6 L22.4,72.6 L21.1,73.5 L23.8,74.4 L22.4,75.3 L23.2,76.3 L24.1,77.2 L27.3,78.1 L28.4,79.1 L29.5,80.0 L28.1,80.9 L29.5,81.9 L30.8,82.8 L32.4,83.7 L37.6,84.7 L36.2,85.6 L43.0,86.5 L47.0,87.4 L44.9,88.4 L50.0,89.3 L52.4,90.2 L52.4,91.2 L52.7,92.1 L51.6,93.0 L52.2,94.0 L54.6,94.9 L53.8,95.8 L59.2,96.7 L60.8,97.7 L59.5,99.5 L59.5,99.5 L60.8,97.7 L60.3,96.7 L66.8,95.8 L71.9,94.9 L70.3,94.0 L80.3,93.0 L78.9,92.1 L80.3,91.2 L81.4,90.2 L82.7,89.3 L82.4,88.4 L81.6,87.4 L79.2,86.5 L77.3,85.6 L77.0,84.7 L77.8,83.7 L83.0,82.8 L81.6,81.9 L83.2,80.9 L84.6,80.0 L85.7,79.1 L88.9,78.1 L89.7,77.2 L90.5,76.3 L98.6,75.3 L99.7,74.4 L97.8,73.5 L97.3,72.6 L96.2,71.6 L97.0,70.7 L92.7,69.8 L93.2,68.8 L93.5,67.9 L93.8,67.0 L94.1,66.0 L94.3,65.1 L94.6,64.2 L96.2,63.3 L94.9,62.3 L94.9,61.4 L96.5,60.5 L95.1,59.5 L95.1,58.6 L94.9,57.7 L94.9,56.7 L94.9,55.8 L96.2,54.9 L94.3,54.0 L94.3,53.0 L94.1,52.1 L93.8,51.2 L95.4,50.2 L97.3,49.3 L96.5,48.4 L99.2,47.4 L98.1,46.5 L100.0,45.6 L98.6,44.7 L99.5,43.7 L91.1,42.8 L88.4,41.9 L87.6,40.9 L86.8,40.0 L85.7,39.1 L86.8,38.1 L83.0,37.2 L81.4,36.3 L82.4,35.3 L80.3,34.4 L78.6,33.5 L78.1,32.6 L87.8,31.6 L83.5,30.7 L83.5,29.8 L79.2,28.8 L81.1,27.9 L81.4,27.0 L80.3,26.0 L78.1,25.1 L80.5,24.2 L78.9,23.3 L79.2,22.3 L80.8,21.4 L79.5,20.5 L79.5,19.5 L79.5,18.6 L78.1,17.7 L76.2,16.7 L75.9,15.8 L74.9,14.9 L73.5,14.0 L74.1,13.0 L93.2,12.1 L93.8,11.2 L94.1,10.2 L95.1,9.3 L94.9,8.4 L93.0,7.4 L92.2,6.5 L91.4,5.6 L92.4,4.7 L88.6,3.7 L89.7,2.8 L86.8,1.9 L61.4,0.9 L66.8,0.0 Z"/>
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
