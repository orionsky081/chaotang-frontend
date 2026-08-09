/**
 * 朝堂 OS · 大殿页面数据（按 02-dadian 设计稿还原）
 */

// —— 中央标题 ——
export const HERO = {
  title: "大殿",
  subtitle: "企业AI指挥中枢 · 万务一统",
};

// —— 大殿中央百官点击热区（坐标为占画面的百分比，对准底图人物） ——
export interface Hotspot {
  id: string;
  name: string;
  post: string;
  status: string;
  tone: "green" | "amber" | "blue" | "violet";
  href: string;
  cx: number; // 头顶名牌中心 X（占画面百分比）
  cy: number; // 头顶名牌中心 Y
}

export const MINISTER_HOTSPOTS: Hotspot[] = [
  { id: "gongbu", name: "工部", post: "营造 · 修缮 · 基建", status: "运行中", tone: "green", href: "/departments/gongbu", cx: 21.7, cy: 38.6 },
  { id: "hubu", name: "户部", post: "财政 · 度支 · 资源", status: "报筹中", tone: "amber", href: "/departments/finance", cx: 30.0, cy: 30.4 },
  { id: "shibu", name: "史部", post: "考绩 · 任免 · 文档", status: "运行中", tone: "green", href: "/archive", cx: 34.1, cy: 23.6 },
  { id: "libu", name: "礼部", post: "礼仪 · 公文 · 对外", status: "运行中", tone: "green", href: "/departments/market", cx: 41.6, cy: 26.5 },
  { id: "prime", name: "丞相", post: "总揽 · 会辅 · 裁断", status: "会辅中", tone: "amber", href: "/prime", cx: 50.7, cy: 28.6 },
  { id: "bingbu", name: "兵部", post: "戍卫 · 情势 · 边务", status: "运行中", tone: "green", href: "/departments/ops", cx: 60.7, cy: 26.5 },
  { id: "jinyiwei", name: "锦衣卫", post: "情报 · 侦缉 · 暗访", status: "待命", tone: "blue", href: "/departments", cx: 68.3, cy: 23.6 },
  { id: "qintianjian", name: "钦天监", post: "天象 · 历法 · 预测", status: "已上奏", tone: "violet", href: "/forecast", cx: 73.1, cy: 30.4 },
  { id: "shiguan", name: "史馆", post: "史料 · 起居注 · 典藏", status: "已上奏", tone: "blue", href: "/archive", cx: 79.5, cy: 38.6 },
];
