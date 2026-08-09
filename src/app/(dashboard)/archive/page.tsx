'use client';

/**
 * 史馆 · /archive
 *
 * 顶导由 (dashboard)/layout.tsx 的 ChaotangTopNav 统一接管,
 * 本页只渲染史馆主体(ShiguanPage)+ 史馆专属背景氛围。
 */

import ShiguanPage from '@/features/shiguan/components/ShiguanPage';
import { assetUrl } from '@/lib/asset';
import { Suspense } from 'react';

export default function ArchivePage() {
  return (
    <div
      className="relative h-full w-full overflow-auto"
      style={{
        backgroundColor: '#070b16',
        backgroundImage: `url('${assetUrl('/assets/shiguan/shiguan.webp')}')`,
        backgroundPosition: 'center top',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative" style={{ zIndex: 1 }}>
        <Suspense fallback={null}>
          <ShiguanPage />
        </Suspense>
      </div>
    </div>
  );
}
