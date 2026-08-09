/**
 * 朝堂 OS V2 · 情报中心（锦衣卫）
 *
 * 三栏布局对标上书房：
 *   左栏 · 戚继光夜巡总旗 + 预警信号
 *   中栏 · 密报卷轴（世界地图）
 *   右栏 · 前沿入口 + 六部情报分拨
 *
 * 数据来源：GET /api/frontend/intel/board → 后端情报投影（useSWR）
 */

import { IntelPage } from '@/features/intel';

export default function IntelCenterPage() {
  return <IntelPage />;
}
