/**
 * 上书房 · 常量（资源路径 + 顶部导航 + 快捷旨意）
 */

import type { NavItem } from './types';

/** 静态资源（public/shangshufang/，从 Figma 导出 + 处理） */
export const SHANGSHUFANG_ASSETS = {
  /** 实时背景：原画清晰+暖色压暗，保留拱窗/明月/书案场景（1:1 还原） */
  bgScene: '/shangshufang/bg-shangshufang-scene.webp',
  /** 原画全幅（留档参考） */
  bgFull: '/shangshufang/bg-shangshufang-full.webp',
  /** 丞相立像（大幅，hat-to-hands） */
  portraitChancellor: '/heroes/character-roster/v5-command-center-zhuge-liang.webp',
  /** 钦天监立像 */
  portraitWang: '/heroes/character-roster/forecast-zhang-heng.webp',
} as const;

/**
 * 顶部部门导航。
 * href 对齐 (dashboard) 路由组实际存在的 9 模块路径
 * (与 src/app/(dashboard)/layout.tsx 原版 COURT_MODULES 保持一致)。
 * ChaotangTopNav 用 Link + usePathname 自动高亮当前页。
 */
/**
 * 减法 A(2026-06-03):顶导 11 → 6 核心 + 二级菜单,避免皇帝被入口淹没。
 * 核心(高频、皇帝视角)直挂顶导;六部与诸司收进下拉。
 */
export const CORE_NAV: NavItem[] = [
  { key: 'throne',   label: '大殿',   href: '/overview' },
  { key: 'study',    label: '上书房', href: '/shangshufang' },
  { key: 'strategy', label: '军机处', href: '/command-center' },
  { key: 'archive',  label: '史馆',   href: '/archive' },
];

/** 核心庄园入口:顶导单独渲染,不混入六部/诸司下拉。 */
export const MANOR_NAV: NavItem = { key: 'garden', label: '庄园', href: '/manors' };
