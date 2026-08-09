'use client';

/**
 * 大殿 · /throne(御座主厅)
 *
 * 2026-07-23 新建:此前 /throne 无根 page.tsx，旧重定向又把御座送到
 * `/court-briefing`(上书房)，导致"大殿和上书房长一样"。
 *
 * 恢复自 f09e7cb(monorepo 合并首个提交)时的 `/overview` 页面实现
 * (`features/dadian/components/DadianPage`,当时 `/overview` 就是渲染它),
 * 09ee238("enforce frontend backend boundaries")把 `/overview` 简化为
 * `redirect('/throne')` 时一并删除了 dadian 整个 feature 目录。
 *
 * 恢复范围:PalaceHero(宫殿底图+标题)+ MinisterHotspot×9(百官点击热区,
 * 纯前端导航,无外部依赖)+ ChancellorTodayCard/BottomBar(各自尝试调用的
 * 丞相今日要务与底部副驾驶栏共读同源 `/api/chaotang/study/briefing`,
 * 展示真实待裁决/执行状态，并明确区分加载、空态与后端错误。
 *
 * 顶导由 (dashboard)/layout.tsx 的 ChaotangTopNav 统一接管,本页只渲染大殿主体。
 */

import DadianPage from '@/features/dadian/components/DadianPage';

export default function ThroneHallPage() {
  return (
    <div className="h-full w-full overflow-auto" style={{ background: '#06111f' }}>
      <DadianPage />
    </div>
  );
}
