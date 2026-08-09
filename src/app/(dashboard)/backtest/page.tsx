/**
 * /backtest —— 现场决策回测（破冰演示入口）
 *
 * 独立 demo 页：客户当场粘贴决定→即时漏风险报告。不入导航,URL 直达 /chaotang/backtest。
 * 全客户端纯函数回测,不入库不上传。
 */
import { LiveBacktest } from '@/features/learning';

export default function BacktestPage() {
  return (
    <div className="h-full w-full overflow-y-auto" style={{ background: '#04060e' }}>
      <LiveBacktest />
    </div>
  );
}
