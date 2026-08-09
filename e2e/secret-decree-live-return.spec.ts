/**
 * 密旨真链闭环 E2E(2026-07-13 立 · 需真后端蜂群 :8081)
 *
 * 为什么要这条:1049 条单测全绿,却漏掉了两个用户一眼可见的问题——
 * 「派发回执冒充部门回奏」和「质门阻断时不可采纳的警示看不见」。
 * 原因是那些断言全在测纯函数的**返回值**,而用户消费的是**像素**。
 * 本条只断言用户眼睛能看到的东西,且必须打真后端(mock 会把这类 bug 一起 mock 掉)。
 *
 * 默认跳过(需真蜂群 + 单跑 3~5 分钟):`SECRET_DECREE_LIVE=1 pnpm exec playwright test e2e/secret-decree-live-return.spec.ts`
 */
import { expect, test, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { resolveBasePath } from './helpers/base-path';

const ENABLED = process.env.SECRET_DECREE_LIVE === '1';

function b64url(v: unknown) {
  return Buffer.from(JSON.stringify(v)).toString('base64url');
}

async function seedSession(page: Page) {
  const token = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    user_id: 'e2e-secret-live',
    username: 'secret-live',
    tenant_slug: 'local',
    role: 'owner',
    exp: '2100-01-01T00:00:00.000Z',
  })}.sig`;
  await page.context().addCookies(
    ['http://localhost:3002', 'http://127.0.0.1:3002'].map((url) => ({
      name: 'courtos.access_token',
      value: token,
      url,
    })),
  );
  await page.addInitScript((accessToken) => {
    window.localStorage.setItem(
      'courtos.auth',
      JSON.stringify({
        accessToken,
        refreshToken: 'e2e',
        tenantId: 1,
        username: 'secret-live',
        accountType: 0,
        expiresAt: 4102444800000,
      }),
    );
    window.localStorage.setItem('courtos.onboarded', '1');
  }, token);
}

test.describe('密旨真链:下旨 → 蜂群 → 回奏落定', () => {
  test.skip(!ENABLED, '需真后端蜂群(:8081),设 SECRET_DECREE_LIVE=1 开启');

  test('派发回执不冒充回奏;蜂群回奏后结论与质门状态同屏可见', async ({ page }) => {
    test.setTimeout(420_000); // 真蜂群 3~5 分钟

    await seedSession(page);
    await page.goto(`${await resolveBasePath(page.request)}/court-briefing`, { waitUntil: 'domcontentloaded' });

    const input = page.getByTestId('ssf-ask-input').last();
    await expect(input).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('decree-mode-secret').last().click();
    await input.fill('评估本季供应商集中度风险，给出应对建议。');
    await input.press('Enter'); // 本 dock 是 Enter 发送

    const scroll = page.getByTestId('edict-business-dossier');

    // ① 下旨瞬间:只准说"会审中"。派发回执(调度日志)一个字都不许冒充部门回奏。
    await expect(scroll).toContainText(/会审中/, { timeout: 90_000 });
    await expect(scroll).not.toContainText(/live swarm dispatched|trace_id=|已兑现核验/);

    // ② 蜂群跑完:真结论必须回填进卷轴(不是永远停在"会审中")。
    //    断言「结论到位」,不断言溯源元信息到位——元信息本就该垫底,拿它当代理会把断言绑死在布局上。
    await expect(scroll).toContainText(/jiqun_ai 蜂群回奏 · 会话 \d/, { timeout: 330_000 });
    await expect(scroll).not.toContainText(/live swarm dispatched|trace_id=/);
    await expect(scroll).not.toContainText(/会审中|已受命/); // 占位文案必须被真结论顶掉

    // 首屏「建议」必须是部门实质结论,不是会话号/套话(额度只有 3 行,溯源打头会把结论挤没)
    const adviceText = (await page.getByTestId('edict-brush-page').innerText()).replace(/\s/g, '');
    expect(adviceText.length, '首屏建议几乎为空 = 结论没落到用户眼前').toBeGreaterThan(60);
    expect(adviceText, '首屏建议开头是溯源元信息 → 结论被挤出可视区').not.toMatch(/^建议会话/);

    // ③ 诚实性(本条是本 spec 的存在理由):
    //    质门阻断/无实质结论时,「不可采纳」必须与结论**同屏**可见——不许只躺在详情页或底部对话条里。
    //    质门放行则不许挂告警(套话告警=噪声)。
    //
    //    断言写成**对称不变式**,不按"页面上有没有'质量门阻断'字样"分支——蜂群质量分每轮都在抖
    //    (实测 1.33/1.94/5.0/1.8/2.69),阻断与放行都会出现;且那句话在底部对话条里也有,
    //    拿它当判据等于把断言绑在卡片外的文本上,必然 flaky(2026-07-14 实测抖红一次)。
    const alertBar = page.getByTestId('edict-alert-bar');
    if ((await alertBar.count()) > 0) {
      // 有告警 → 必须可执行(告诉用户补什么),不能只是一句让人无能为力的坏消息
      await expect(alertBar).toBeVisible();
      await expect(alertBar).toContainText(/需补|不得作为最终裁决依据|没拿到/);
    } else {
      // 无告警 → 必须是**真的**过了质门,不能是"该报没报"
      await expect(page.getByText(/质量门阻断/)).toHaveCount(0);
    }
  });
});
