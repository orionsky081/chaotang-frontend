import Link from 'next/link';

export function GlobalDashboardFooter() {
  return (
    <footer data-testid="global-dashboard-footer" className="flex min-h-9 items-center justify-between gap-4 border-t border-white/5 bg-[#05070D]/95 px-4 py-2 text-[10px] text-[#6A7299]">
      <Link href="/shangshufang" className="advisor-card flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#F0C66A]/45 bg-[#F0C66A]/10 font-serif text-[12px] font-bold text-[#F0C66A]">N</span>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] font-medium text-[#F5E9C9]">问丞相</span>
          <span className="text-[10px] text-[#8A9BB8]">先压判断与缺证</span>
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <span className="hidden text-[#6A7299] md:inline">朝堂OS · 浏览器展示层</span>
        <Link href="/court-briefing" className="text-[#B6AB8C] hover:text-[#F0C66A]">上书房</Link>
        <Link href="/command-center" className="text-[#B6AB8C] hover:text-[#F0C66A]">军机处</Link>
        <Link href="/status" className="text-[#B6AB8C] hover:text-[#F0C66A]">后端体征</Link>
      </div>

      <Link href="/forecast" className="advisor-card flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 transition">
        <span className="flex flex-col items-end leading-tight">
          <span className="text-[11px] font-medium text-[#F5E9C9]">问钦天监</span>
          <span className="text-[10px] text-[#8A9BB8]">先看时机与风险</span>
        </span>
      </Link>
    </footer>
  );
}
