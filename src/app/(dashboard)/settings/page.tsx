import { redirect } from 'next/navigation';

/**
 * 旧设置页在浏览器拼装数据库、模型与发布门状态，且依赖已退役的 BFF 路由。
 * 系统事实统一展示在后端健康页；审计日志仍保留在 /settings/audit。
 */
export default function SettingsPage() {
  redirect('/status');
}
