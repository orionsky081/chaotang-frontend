import { redirect } from 'next/navigation';

/**
 * 旧版“私召尚书”页面在浏览器内生成官员档案、奏折正文和版本历史，既伪造
 * 业务事实，也让前端承担了持久化职责。真实上书、批示与版本记录统一由后端
 * 驱动的上书房处理；保留旧 URL 只为兼容既有书签。
 */
export default function LegacyOfficialStudyPage() {
  redirect('/court-briefing');
}
