/**
 * 朝堂 OS V2 · Dashboard layout
 *
 * 负责 dashboard 级页面骨架编排：顶部导航、底部信息条和全局浮层。
 * 具体 flex 结构由 DashboardAppShell 承载，业务页面只渲染自己的内容。
 */

'use client';

import { useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardAppShell } from '@/components/chaotang/layout/DashboardAppShell';
import { useCourtPulse } from '@/features/shared/hooks/use-court-pulse';
import { ChaotangTopNav } from '@/features/shangshufang/components/ChaotangTopNav';
import { CommandPalette } from '@/features/shared/components/command-palette';
import { GlobalDashboardFooter } from '@/features/shared/components/global-dashboard-footer';
import { TitleBadge } from '@/features/shared/components/title-badge';
import { VerdictCardModal } from '@/features/shared/components/verdict-card-modal';
import { VermilionAnnotator } from '@/features/shared/components/vermilion-annotator';
import { apiGateway, API_PATHS } from '@/lib/api/gateway';
import { clearSession } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hiddenChromeRoutes = ['/study'];
  const hideTopNav = hiddenChromeRoutes.some((p) => pathname === p);
  const hideFooterRoutes = ['/shangshufang', '/court-briefing'];
  const hideFooter = hideFooterRoutes.some((p) => pathname === p);
  const hideFloatingChrome = false;
  const pulse = useCourtPulse(!hideTopNav);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await apiGateway.del(API_PATHS.auth.logout, { expectJson: false });
    } catch {
      // Best-effort cookie revoke.
    } finally {
      clearSession();
      router.replace('/login');
    }
  }, [router]);

  const header = !hideTopNav ? (
    <>
      <ChaotangTopNav
        onLogout={() => void handleLogout()}
        loggingOut={loggingOut}
        notifyCount={pulse.pendingReviews}
      />
    </>
  ) : null;

  const footer = !hideTopNav && !hideFooter ? <GlobalDashboardFooter /> : null;

  const floatingChrome = (
    <>
      {!hideFloatingChrome && <CommandPalette pulse={pulse} />}
      {!hideFloatingChrome && <TitleBadge pendingCount={pulse.pendingReviews ?? 0} />}
      {!hideFloatingChrome && <VerdictCardModal />}
      {!hideFloatingChrome && <VermilionAnnotator />}
    </>
  );

  return (
    <DashboardAppShell header={header} footer={footer} floatingChrome={floatingChrome}>
      {children}
    </DashboardAppShell>
  );
}
