import { redirect } from 'next/navigation';

/** 旧登基页播放浏览器内置回奏脚本；真实下旨统一进入后端编排入口。 */
export default function LegacyCoronationPage() {
  redirect('/throne/compose');
}
