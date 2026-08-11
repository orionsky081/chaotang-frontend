import { assetUrl } from '@/lib/asset';

/**
 * 朝堂OS 品牌标记（龙形 SVG）。
 * 统一替代此前分散在欢迎页（🐉 emoji）、导航栏（内联印章 SVG）、
 * 登录/注册（Crown 图标）的各处 logo，保证全站一致。
 *
 * 原图：public/logo-dragon.svg（金色 #FFD700 镂空龙，透明底）。
 * 暗色背景下对比最佳；传入的 className 控制尺寸。
 */
export function BrandLogo({
  className = 'h-7 w-7',
  alt = '朝堂OS',
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={assetUrl('/logo-dragon.svg')}
      alt={alt}
      className={className}
    />
  );
}
