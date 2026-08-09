/**
 * 六部大厅 vitrine · 真/骨架派生（纯函数 · 2026-06-27）
 *
 * 部门卡只表达“后端页面资源已注册”。真实数据是否可用由页面 REST
 * 响应的 source/status 决定，前端不再通过本地业务工作台推断。
 *
 * 铁律4 不变量：真徽(金光/LIVE) ⟺ 真注册了办公厅。严禁硬编码"哪些部门是真"的平行清单——
 * 否则某天有人手滑把没做完的部门点亮金光，就把老板/客户骗了。回归断言钉死此等式。
 */
import { isDepartmentBoardCode } from '@/lib/contracts/department-board';

/** 庄园六部卡 key → 六部部门码。 */
export const MINISTRY_TO_DEPT_CODE: Record<string, string> = {
  libu: 'personnel',
  hubu: 'finance',
  libu2: 'market',
  bingbu: 'ops',
  xingbu: 'legal',
  gongbu: 'gongbu',
};

/** 该庄园卡对应的部门是否「真」（注册了升级版办公厅）。 */
export function isMinistryLive(ministryKey: string): boolean {
  const code = MINISTRY_TO_DEPT_CODE[ministryKey];
  return !!code && isDepartmentBoardCode(code);
}
