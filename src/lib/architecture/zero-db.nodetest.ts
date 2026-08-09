/**
 * 前端零 DB 结构守门（2026-07-18 立）。
 *
 * 主库已全迁后端，前端**不得再持有任何数据库驱动或直连**。此前这条只是约定，
 * 结果是残余反复回潮：`.chaotang-*.db` 文件、`@libsql/client` 依赖、只测自己的 SQL 常量、
 * 一个报着不存在的本地库路径的 `primaryDbSource()`——每次做架构分析都要先把它们重新排除一遍，
 * 更糟的是其中两处会**主动说假话**（僵尸晨报脚本、盖假落点的写入回执）。
 *
 * 所以把"零 DB"从约定升级成断言：谁把驱动加回来，这里立刻红。
 *
 * 跑：pnpm test:node（已含 src/**\/*.nodetest.ts）
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertScanAlive } from '../guards/scan-alive.ts';

const FRONTEND_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
/**
 * 跳过的目录 —— **按"相对 frontend 根的精确路径"匹配，不按目录名**。
 *
 * 2026-07-19 独立会审取证：原来是 `SKIP_DIRS.has(entry)`，即在**任意深度**按名跳过。
 * 于是 `src/features/xxx/dev/db.ts`、`scripts/tools/_attic/seed.py` 这类路径永久隐身——
 * 谁想偷偷加个库，只要建一个叫 `dev` 的子目录就行。实测确认可绕过（守门照样全绿）。
 * 现在只跳这几条确定的根路径，深处的 `dev/` 不再是隐身衣。
 */
const SKIP_PATHS = new Set(
  ['node_modules', '.next', '.next-dev', '.next-e2e', 'test-results', 'playwright-report'].map(
    (d) => join(FRONTEND_ROOT, d),
  ),
);

/**
 * 扫描根。**不止 src/** —— 2026-07-18 独立会审取证：本守门初版只扫 `src/`、只认 .ts/.tsx/.mjs/.js，
 * 于是 `scripts/jinyiwei_intel_pipeline.py`（真 `import sqlite3` + 真 `DELETE FROM intel_signals`）
 * 和它的 `.test.py`（无条件建库写行）**整整三轮都在盲区里**，守门还一路发绿灯。
 * 守门的扫描面比守门的断言更容易出错，而且错了不会有任何症状。
 */
// 扫整个 frontend 根，而不是维护一份迟早漏目录的固定清单。2026-07-19 红队证明：
// 根 dev/、deploy/、public/ 都能藏可执行数据库代码并让旧守门继续全绿。
const SCAN_ROOT = FRONTEND_ROOT;

/** 扫描的文件类型。含 .py/.sh：违规不挑语言，而前端仓里确实住过 Python 脚本。 */
const SCAN_EXT = /\.(ts|tsx|mjs|js|cjs|py|sh)$/;

/**
 * 数据库驱动/客户端。名单只增不减——少一个名字就是一个盲区。
 * 含 Python 侧（sqlite3/psycopg2/pymysql/sqlalchemy）：前端仓不该有任何语言的库连接。
 */
const DB_DRIVERS = [
  '@libsql/client',
  'libsql',
  'better-sqlite3',
  'sqlite3',
  'node:sqlite',
  'drizzle-orm',
  '@prisma/client',
  'prisma',
  'postgres',
  'pg',
  'mysql2',
  'mongodb',
  'redis',
  'ioredis',
  'kysely',
  'typeorm',
  'sequelize',
  'knex',
  'lowdb',
  '@vercel/postgres',
  '@neondatabase/serverless',
  // Python 侧
  'psycopg2',
  'pymysql',
  'sqlalchemy',
  // 浏览器端 DB 包（不连后端，但同样是"前端自己存数据"）
  'dexie',
  'idb',
  'localforage',
  'pouchdb',
  'sql.js',
  'wa-sqlite',
  '@sqlite.org/sqlite-wasm',
  '@electric-sql/pglite',
];

/**
 * **零依赖**就能在浏览器里建库的原生 API —— 装包检查对它们完全无效。
 * 2026-07-19 取证：`features/libu/lib/library-index.ts:80` 有一个真的 `indexedDB.open('courtos.libu')`
 * 带 objectStore，而当时的守门（只查 import 与依赖）对它一无所知。
 * 那处经查是**从未接通的骨架**（`openLibuDB` 全仓零调用，御书房实际用 localStorage），
 * 所以列进白名单而不是判红——但它证明了一件事：**不 import 任何东西也能有数据库**。
 */
const BROWSER_DB_APIS = [
  'indexedDB.open',
  'openDatabase(', // WebSQL
  'createSyncAccessHandle', // OPFS
];

/**
 * 已知且已判定无害的原生存储用法（**只许变短**）。新增一处必须在这里交代。
 *
 * 2026-07-19：曾有一条 `library-index.ts`（openLibuDB 骨架）。那段代码已删除，
 * 故本表清空——白名单条目跟着实体走，实体没了就删条目，否则表会虚高，
 * 下一个人会以为还有一处"已知例外"而放松警惕。
 */
const BROWSER_DB_ALLOWED: ReadonlyArray<[string, string]> = [];
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (SKIP_PATHS.has(full)) continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(entry)) out.push(full);
  }
  return out;
}

const SCANNED_FILES = walk(SCAN_ROOT);

test('零 DB：frontend 全部可执行文件都不得 import 数据库驱动', () => {
  const hits: string[] = [];
  for (const file of SCANNED_FILES) {
    // 本文件自己列着驱动名，跳过，否则永远自己咬自己。
    // 同时跳过攻击集：zero-db-bypass.nodetest.ts 的 ATTACK 载荷里就是真的 import 字符串
    // （它存在的意义就是拿这些字符串来打这道门），扫它等于永远咬自己。
    if (file.endsWith('zero-db.nodetest.ts') || file.endsWith('zero-db-bypass.nodetest.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const driver of DB_DRIVERS) {
      // 只认真正的 import/require，不认注释里提到的包名（历史注释大量提及 libsql）。
      const d = driver.replace(/[/@-]/g, '\\$&');
      // 四种形态都认：ESM from / require() / 动态 import() / Python import|from
      // 动态 import 是初版的漏洞：`await import('@libsql/client')` 可完全绕过 from|require 正则。
      // `(?:/[^'"`]*)?` 不可省：2026-07-19 会审实测 `from '@libsql/client/web'` 能完全绕过
      // 旧正则（它要求引号紧贴包名结尾）。libsql/drizzle/prisma 都有子路径入口，
      // 少这一段等于名单上每个包都留了一扇后门。
      const pattern = new RegExp(
        `(?:from\\s+|require\\(\\s*|import\\(\\s*)['"\`]${d}(?:/[^'"\`]*)?['"\`]` +
          `|^\\s*(?:import|from)\\s+${d}(?:\\s|$|,|\\.)`,
        'm',
      );
      if (pattern.test(text)) hits.push(`${relative(FRONTEND_ROOT, file)} → ${driver}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    `前端不得直连数据库（唯一持久化 SoT 在后端，经同源 JSON REST/BFF 访问）。命中：\n  ${hits.join('\n  ')}`,
  );
});

test('零 DB：package.json 依赖里没有数据库驱动', () => {
  const pkg = JSON.parse(readFileSync(join(FRONTEND_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  const hits = DB_DRIVERS.filter((d) => d in declared);
  assert.deepEqual(
    hits,
    [],
    `前端 package.json 不该再声明数据库驱动（连 devDependencies 也不行——一旦在依赖里，` +
      `就总有人会 import 它，零 DB 又变回口头约定）。命中：${hits.join(', ')}`,
  );
});

test('零 DB：心跳（扫描面不得归零）', () => {
  assertScanAlive('零 DB', {
    'frontend 可执行文件': SCANNED_FILES.length,
    检查的驱动: DB_DRIVERS.length,
  });
});

test('零 DB：任何 lockfile 里都不得有数据库驱动', () => {
  // 2026-07-18 独立会审取证：本守门初版只读 package.json，于是 **已提交的**
  // `package-lock.json`（pnpm 迁移前的遗物，最后一次变动在 monorepo 合并那次）
  // 仍声明着 "@libsql/client": "^0.17.4" 整整三轮无人发现——package.json 说没有、
  // lockfile 说有，谁跑一次 `npm ci` 就整套装回来。
  // 依赖的真相在 lockfile，不在 package.json：前者才是安装时被真正执行的那份。
  const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'npm-shrinkwrap.json'];
  const hits: string[] = [];
  for (const lock of LOCKFILES) {
    const full = join(FRONTEND_ROOT, lock);
    if (!existsSync(full)) continue;
    const text = readFileSync(full, 'utf8');
    for (const driver of DB_DRIVERS) {
      // lockfile 里包名以路径/键的形式出现，宽松匹配即可（宁可多报，这里没有正常引用）
      if (new RegExp(`["'/]${driver.replace(/[/@-]/g, '\\$&')}["'@/]`).test(text)) {
        hits.push(`${lock} → ${driver}`);
      }
    }
  }
  assert.deepEqual(
    hits,
    [],
    'lockfile 里仍锁着数据库驱动——package.json 干净不代表装出来干净。\n  ' +
      hits.join('\n  ') +
      '\n  注意：本仓用 pnpm（pnpm-lock.yaml + pnpm-workspace.yaml），若冒出 package-lock.json，' +
      '它多半是历史遗物，两个 lockfile = 两个真相源，直接删掉而不是修它。',
  );
});

test('零 DB：浏览器原生存储 API 不得新增（indexedDB / WebSQL / OPFS）', () => {
  // 装包检查对这些完全无效：不 import 任何东西就能建库。
  const hits: string[] = [];
  const allowed = new Set(BROWSER_DB_ALLOWED.map(([f]) => f));
  for (const file of SCANNED_FILES) {
    if (file.endsWith('zero-db.nodetest.ts') || file.endsWith('zero-db-bypass.nodetest.ts')) continue;
    const rel = relative(FRONTEND_ROOT, file).split(/[\\/]/).join('/');
    if (allowed.has(rel)) continue;
    // 只看**可执行代码**：剥掉 // 行注释与 /* */ 块。
    // 2026-07-19 踩过：删掉 openLibuDB 后写了段说明注释，里面提到 `indexedDB.open`，
    // 守门当场对着"解释为什么删掉它"的文字报警——与后端 lint_zero_defaults 同一个病：
    // 一个会对注释报警的门，两周内就会被所有人加进"已知噪音"。
    const code = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, ''))
      .join('\n');
    for (const api of BROWSER_DB_APIS) {
      if (code.includes(api)) hits.push(`${rel} → ${api}`);
    }
  }
  assert.deepEqual(
    hits,
    [],
    '前端出现了新的浏览器端数据库用法。它不需要任何 npm 包，因此依赖检查抓不到它。\n  ' +
      hits.join('\n  ') +
      '\n  若确有必要（纯本地、用户自己的数据、不与主库语义重叠），加进 BROWSER_DB_ALLOWED 并写清理由；' +
      '若是共享业务数据，应经同源 JSON REST/BFF 落后端。',
  );
});
