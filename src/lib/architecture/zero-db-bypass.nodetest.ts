/**
 * 攻击守门 —— 已知绕过手法的回归集（2026-07-19 立）。
 *
 * ## 为什么要有这个文件
 *
 * 连续两轮，零 DB 守门都是被**外部审计**打穿的，而两轮里作者自己跑守门都是绿的。
 * 原因不是不认真，是视角问题：
 *
 *   **守门的扫描面是作者划的，所以作者划得出的地方他早就查过了。
 *   自证守门的盲区，恰好等于作者的盲区，一分不差。**
 *
 * 防御视角问"我查了什么"，攻击视角问"我漏了什么"——只有后者能找到盲区。
 * 已被实测证实有效的三种绕过（全部不是分析出来的，是站在攻击者视角问出来的）：
 *   ① 子路径导出 `from '@libsql/client/web'` —— 正则要求引号紧贴包名结尾
 *   ② `dev` 目录隐身 —— SKIP_DIRS 按目录名在**任意深度**跳过
 *   ③ 浏览器原生 API `indexedDB.open` —— 不 import 任何包，没有包名可匹配
 *
 * ## 这个文件怎么用（改守门时的固定动作）
 *
 * 1. 动 `zero-db.nodetest.ts` 之前，先写下**三种**"如果我要偷偷加个数据库，我会怎么绕过它"；
 * 2. 每一种在下面加一个 ATTACK 条目；
 * 3. 跑本测试。**被守门抓住 = 绿；能绕过去 = 红**，说明这条攻击有效，去补守门；
 * 4. 补完守门后本测试转绿，这条攻击就永久留在这里当回归——
 *    下次有人"优化"守门正则时，它会替你把这个洞重新拦住。
 *
 * 攻击不是一次性验证，是资产。每发现一种绕过，这个集合就长一条，永不回退。
 *
 * 跑：pnpm test:guards
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertScanAlive } from '../guards/scan-alive.ts';

const FRONTEND_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

// GUARD 相对**本文件自身**解析，不写死一条独立字符串。
// 2026-07-20 实锤过的绕法：b587716 把守门从 src/lib/db/ 挪到 src/lib/architecture/，
// 但这里曾经硬编码的 'src/lib/db/zero-db.nodetest.ts' 没跟着改——GUARD 指向一个不存在
// 的文件，runGuard() 对不存在的文件恒返 ok:false，于是下面 9 条攻击的 assert.ok(!ok)
// 全部"恰好"为真，不是因为守门拦住了攻击，是因为守门根本没被跑起来。
// zero-db.nodetest.ts 和本文件现在是、以后也应该继续是同目录兄弟——攻击集要验证的
// 就是"隔壁那份守门"，用 import.meta.url 解析这份"隔壁"关系，整个目录一起搬家时
// 两者的相对位置不变，不会重蹈这次的覆辙。
const GUARD_ABS = fileURLToPath(new URL('./zero-db.nodetest.ts', import.meta.url));
const GUARD = relative(FRONTEND_ROOT, GUARD_ABS);

// Fail-loud，且在任何 test() 注册之前：如果解析出的文件不存在，这不是"守门里有
// 真违规"，是这份攻击集找不到它要验证的对象——下面所有攻击测试即将全部假绿。
// 必须让它整份文件加载失败、用一条无歧义的消息说清楚，而不是退化成第 135 行那条
// "守门在干净状态下必须绿"里含糊的 ok:false（那条断言现在只应该对应"文件确实
// 存在、但执行结果是红的"这一种情况——真违规，或者守门自己因为无关原因跑崩了）。
if (!existsSync(GUARD_ABS)) {
  throw new Error(
    `零 DB 攻击守门的 GUARD 路径漂移，不是"守门发现了真违规"：\n` +
      `  解析出的文件不存在：${GUARD_ABS}\n` +
      `  下面所有攻击测试即将全部假绿（runGuard() 对不存在的文件恒返 ok:false，\n` +
      `  每条攻击的 assert.ok(!ok) 会误判"被拦下了"）。\n` +
      `  → 检查 zero-db.nodetest.ts 是否被改名/挪到了别的目录，且不再与本文件同目录。`,
  );
}

interface Attack {
  /** 这种绕过叫什么 */
  name: string;
  /** 攻击者会把文件放在哪（相对 frontend 根） */
  path: string;
  /** 文件内容 —— 一段真能连库/建库的代码 */
  code: string;
  /** 发现日期与来源，说明它不是凭空想的 */
  found: string;
}

/**
 * 已知绕过手法。**只增不减**：删掉一条 = 主动放弃一个已经交过学费的教训。
 */
const ATTACKS: Attack[] = [
  {
    name: '子路径导出（包名后加 /web、/http 等）',
    path: 'src/lib/__attack-subpath.ts',
    code: "import { createClient } from '@libsql/client/web';\nexport const c = createClient;\n",
    found: '2026-07-19 独立会审；旧正则要求引号紧贴包名结尾，libsql/drizzle/prisma 都有子路径入口',
  },
  {
    name: 'dev 目录隐身（任意深度的 dev/ 被跳过）',
    path: 'src/features/__attack/dev/db.ts',
    code: "import { createClient } from '@libsql/client';\nexport const c = createClient;\n",
    found: '2026-07-19 独立会审；SKIP_DIRS 原按目录名在任意深度跳过，建个叫 dev 的子目录即隐身',
  },
  {
    name: '_attic 目录隐身',
    path: 'src/lib/__attack/_attic/db.ts',
    code: "import { createClient } from 'better-sqlite3';\nexport const c = createClient;\n",
    found: '2026-07-19 同上，_attic 与 dev 同一个病',
  },
  {
    name: '浏览器原生 IndexedDB（不 import 任何包）',
    path: 'src/lib/__attack-idb.ts',
    code: "export const d = indexedDB.open('sneaky', 1);\n",
    found: '2026-07-19 独立会审；`features/libu/lib/library-index.ts` 真有过一处，守门当时完全无感',
  },
  {
    name: '动态 import（绕过 from/require 正则）',
    path: 'src/lib/__attack-dynamic.ts',
    code: "export async function x() { return await import('@libsql/client'); }\n",
    found: '2026-07-18 首轮审计指出；旧正则只认 from|require',
  },
  {
    name: 'Python 脚本连库（不是 JS 就不查）',
    path: 'scripts/__attack.py',
    code: 'import sqlite3\ncon = sqlite3.connect("x.db")\ncon.execute("DELETE FROM t")\n',
    found: '2026-07-18 首轮审计；当时守门只扫 src/ 且只认 .ts/.tsx，真违规就藏在 scripts/*.py',
  },
  {
    name: '根 dev/_attic 隐身（固定扫描根之外）',
    path: 'dev/_attic/__attack-db.ts',
    code: "import Database from 'better-sqlite3';\nexport const db = new Database('archive.db');\n",
    found: '2026-07-19 反向审计；根 dev 被整体排除，退役目录里仍有可执行 DB 代码',
  },
  {
    name: 'deploy 目录藏 Python 数据库脚本',
    path: 'deploy/__attack-db.py',
    code: 'import sqlite3\ncon = sqlite3.connect("deploy.db")\n',
    found: '2026-07-19 反向审计；固定扫描根不含 deploy，部署模板可把旧持久化重新带回前端',
  },
  {
    name: 'public 目录藏可执行数据库客户端',
    path: 'public/__attack-db.js',
    code: "const Database = require('better-sqlite3');\nnew Database('public.db');\n",
    found: '2026-07-19 红队推演；固定扫描根不含 public，而该目录内容会直接进入发布产物',
  },
];

function runGuard(): { ok: boolean; output: string } {
  // 必须剥掉 NODE_TEST_CONTEXT / NODE_TEST_WORKER_ID：本文件自己跑在 node --test 下，
  // 子进程继承这两个变量后，内层 node 会切成"向父 runner 汇报"模式，**不再用退出码表达失败**——
  // 于是每条攻击都会被误判成"绕过成功"。第一版就栽在这，6 条攻击全假红。
  // （教训本身很对味：连"验证守门"的工具也会骗你，所以它同样需要被验证。）
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  delete env.NODE_TEST_WORKER_ID;
  try {
    const out = execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--test', GUARD],
      { cwd: FRONTEND_ROOT, encoding: 'utf8', stdio: 'pipe', env },
    );
    return { ok: true, output: out };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
  }
}

test('攻击守门：守门在干净状态下必须是绿的（否则下面每条攻击都会假阳性）', () => {
  const { ok, output } = runGuard();
  assert.ok(
    ok,
    '零 DB 守门在没有任何攻击注入时就已经是红的 —— 先把它修绿，' +
      '否则本文件的每条攻击都会"看起来被拦住了"，实际只是搭了顺风车。\n' +
      output.split('\n').filter((l) => l.includes('✖') || l.includes('→')).slice(0, 5).join('\n'),
  );
});

for (const atk of ATTACKS) {
  test(`攻击守门：${atk.name} —— 必须被拦下`, () => {
    const full = join(FRONTEND_ROOT, atk.path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, atk.code, 'utf8');
    try {
      const { ok, output } = runGuard();
      assert.ok(
        !ok,
        `这种写法**绕过了**零 DB 守门（守门仍然全绿）。\n` +
          `  攻击：${atk.path}\n` +
          `  代码：${atk.code.trim().split('\n')[0]}\n` +
          `  出处：${atk.found}\n` +
          `  → 去补 ${GUARD}（扫描面 / 正则 / 名单 / 原生 API 维度），` +
          `补完本条自然转绿。\n${output.slice(0, 300)}`,
      );
    } finally {
      // 无论断言成败都必须清干净：留下攻击文件会污染后续测试与真实构建。
      rmSync(full, { force: true });
      const probeDir = join(FRONTEND_ROOT, atk.path.split('/').slice(0, 3).join('/'));
      if (probeDir.includes('__attack')) rmSync(probeDir, { recursive: true, force: true });
    }
  });
}

test('攻击守门：心跳（攻击集不得被清空）', () => {
  // 这个集合最可能的腐烂方式不是失效，是**被人删条目**——某条攻击碍事了就删掉它，
  // 于是一个交过学费的教训被悄悄放弃，而测试从此全绿。心跳把条目数摆在明面上。
  assertScanAlive('零 DB 攻击集', { 已知绕过手法: ATTACKS.length });
});
