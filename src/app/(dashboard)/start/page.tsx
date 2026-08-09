import { redirect } from 'next/navigation';

/** 旧“板块点亮”清单由前端常量宣告状态；真实能力状态改由后端注册表提供。 */
export default function LegacyStartPage() {
  redirect('/power');
}
