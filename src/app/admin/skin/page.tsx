/**
 * /admin/skin — 皮肤切换占位
 *
 * /admin 页面有一张"皮肤切换 即将上线"卡（disabled），但用户直敲 URL
 * /chaotang/admin/skin 之前会 404。这里 redirect 回 /admin。
 *
 * 真正的皮肤切换（朝堂 / 董事会 / 宇宙星系）等 IP 扩展时再做。
 */
import { redirect } from 'next/navigation';

export default function SkinPlaceholder() {
  redirect('/admin');
}
