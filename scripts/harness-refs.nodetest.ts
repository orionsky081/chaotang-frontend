/**
 * harness 自省守门（2026-07-18 立）。
 *
 * 门禁最爱说「某某测试/某某脚本替我兜底」。那句话一旦变假，**没有任何机制会出声**——
 * 它不是代码，不会编译失败，只会在发布会议上被人当作证据引用。本测试给这类断言一个出声的机会。
 *
 * 查两件事（都只查**可机械验证**的部分，别假装能查语义）：
 *   1. harness 脚本里提到的仓内文件路径，必须真实存在；
 *   2. harness 脚本里调用的 npm script（`pnpm X` / `npm run X`），必须在 package.json 里存在。
 *
 * ⚠️ 它**查不到**什么（写在这里，免得下一个人高估它）：
 *   上一轮真正出事的是「`briefing-queries.nodetest.ts` 直跑 SQL、必咬人」这句——那个文件
 *   一直存在，变的是**它内部的测试被删了**。本测试对此**完全无能为力**：路径在、npm script 在，
 *   全绿。文件存在 ≠ 它还在守你说的那件事。
 *   语义层的过期只能靠人（改测试时搜一遍谁在引用它）。本测试只负责把「引用了一个根本不存在的
 *   东西」这一类——纯机械、纯确定、人却总是漏——挡在门外。
 *
 * 跑：pnpm test:guards
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertScanAlive } from '../src/lib/guards/scan-alive.ts';

const FRONTEND_ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO_ROOT = join(FRONTEND_ROOT, '..');
const SCRIPTS = join(FRONTEND_ROOT, 'scripts');

/** 仓内文件路径的形状：至少带一层目录 + 已知的脚本/测试扩展名。 */
const PATH_RE = /[\w./$@{}[\]-]*\.(?:nodetest\.ts|spec\.ts|test\.ts|test\.py|mjs|sh)\b/g;

/**
 * 豁免：**运行时生成**的文件，仓里本就不该有。
 * 每条必须写清「谁生成它」，否则这个豁免表迟早变成"红了就往里加一行"的垃圾桶。
 */
const GENERATED_AT_RUNTIME = new Map<string, string>([
  ['start.sh', 'package-release.mjs:138 自己写进发布包 stage 目录的启动脚本，非仓内源码'],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function harnessFiles(): string[] {
  return walk(SCRIPTS).filter((f) => /\.(mjs|sh|py)$/.test(f));
}

/** 跳过无法机械判定的 token：变量插值、glob、绝对路径、URL、纯扩展名片段。 */
function unresolvable(token: string): boolean {
  if (!token.includes('/')) return true; // 裸文件名太含糊（且常出现在叙述性文字里）
  if (/[$*~{]/.test(token)) return true; // $REPO_DIR/... 、glob、${var}
  if (token.startsWith('/') || token.startsWith('http')) return true;
  const bare = token.replace(/^\.\//, '');
  if (/(^|\/)\./.test(bare)) return true; // 形如 ".nodetest.ts" 的正则残片
  return false;
}

/**
 * 解析根。含 backend/ 是因为 monorepo 里 harness 脚本会**先 cd 到后端再给命令**，
 * 例如 system-restore.sh 让你 `cd <checkout>/chaotang-os/backend` 后跑 `bash scripts/serve-dev.sh`
 * ——那个文件真的在 `backend/scripts/serve-dev.sh`。少了这个根，它会被误报成悬空引用
 * （本测试初版就栽在这，把一条正确的恢复指令判成了 bug）。
 *
 * 代价：路径判定是"在任一根下存在即通过"，比逐脚本推算 cwd 松。这是刻意的取舍——
 * 宁可漏报，不可误报：一个爱喊狼来了的守门，两周内就会被人加 skip 绕过去。
 */
function resolvesInRepo(rel: string): boolean {
  return [
    FRONTEND_ROOT,
    SCRIPTS,
    REPO_ROOT,
    join(REPO_ROOT, 'backend'),
    join(REPO_ROOT, 'frontend'),
  ].some((root) => existsSync(join(root, rel)));
}

/**
 * 扫描结果。**只扫一次**，断言和自曝行都读这一份。
 *
 * 为什么不各扫各的：那样会出现最糟的一种情况——自曝行打印着漂亮的数字，
 * 而断言实际扫的是空集。自曝的意义就是替断言作证，两者必须共享同一次扫描，
 * 否则它证明的是它自己。
 */
interface ScanResult {
  filesScanned: number;
  pathRefsChecked: number;
  exemptionsHit: number;
  missing: string[];
}

function scanPathRefs(): ScanResult {
  let filesScanned = 0;
  let pathRefsChecked = 0;
  let exemptionsHit = 0;
  const missing: string[] = [];

  for (const file of harnessFiles()) {
    if (file.endsWith('harness-refs.nodetest.ts')) continue; // 本文件自己举了反例，跳过
    filesScanned++;
    const text = readFileSync(file, 'utf8');
    const seen = new Set<string>();
    for (const match of text.matchAll(PATH_RE)) {
      const token = match[0];
      if (unresolvable(token)) continue;
      const rel = token.replace(/^\.\//, '');
      if (seen.has(rel)) continue;
      seen.add(rel);
      pathRefsChecked++;
      if (GENERATED_AT_RUNTIME.has(rel)) {
        exemptionsHit++;
        continue;
      }
      if (resolvesInRepo(rel)) continue;
      missing.push(`${relative(FRONTEND_ROOT, file).split(sep).join('/')} → ${rel}`);
    }
  }
  return { filesScanned, pathRefsChecked, exemptionsHit, missing };
}

const scan = scanPathRefs();

test('harness 自省：脚本里提到的仓内文件路径必须真实存在', () => {
  assert.deepEqual(
    scan.missing,
    [],
    'harness 脚本引用了不存在的文件。这类引用最常见的下场是：出事时有人照着它去跑/去查，' +
      '扑个空还以为是自己环境坏了。\n  ' +
      scan.missing.join('\n  ') +
      '\n  修法：改成真实路径；文件已退役就把那句话删掉或写明去向；' +
      '若是运行时生成的，加进 GENERATED_AT_RUNTIME 并写清谁生成它。',
  );
});

test('harness 自省：脚本里调用的 npm script 必须在 package.json 里存在', () => {
  const pkg = JSON.parse(readFileSync(join(FRONTEND_ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const declared = new Set(Object.keys(pkg.scripts ?? {}));

  // `pnpm run x` / `pnpm x` / `npm run x` / `yarn x`；只认冒号命名的仓内 script，
  // 免得把 `pnpm install`、`pnpm exec` 这类内置子命令误判成缺失。
  const CALL_RE = /\b(?:pnpm|npm|yarn)\s+(?:run\s+)?['"]?([a-z][a-z0-9]*:[a-z0-9:-]+)['"]?/g;
  const missing: string[] = [];
  for (const file of harnessFiles()) {
    if (file.endsWith('harness-refs.nodetest.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(CALL_RE)) {
      const name = match[1];
      if (declared.has(name)) continue;
      const entry = `${relative(FRONTEND_ROOT, file).split(sep).join('/')} → ${name}`;
      if (!missing.includes(entry)) missing.push(entry);
    }
  }
  assert.deepEqual(
    missing,
    [],
    'harness 脚本调用了 package.json 里不存在的 npm script（删 script 时最容易漏掉调用方）。\n  ' +
      missing.join('\n  '),
  );
});

test('harness 自省：package.json 的 script 指向的仓内文件必须存在', () => {
  const pkg = JSON.parse(readFileSync(join(FRONTEND_ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const missing: string[] = [];
  for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
    for (const match of cmd.matchAll(PATH_RE)) {
      const token = match[0];
      if (unresolvable(token)) continue;
      const rel = token.replace(/^\.\//, '');
      if (GENERATED_AT_RUNTIME.has(rel) || resolvesInRepo(rel)) continue;
      missing.push(`"${name}": ${cmd}  → 缺 ${rel}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    'package.json 的 script 指向不存在的文件——跑它必 ENOENT。' +
      '（删脚本时漏改 scripts 就是这样：`metrics:daily` 曾在源文件删除后继续挂着。）\n  ' +
      missing.join('\n  '),
  );
});

test('harness 自省：心跳（扫描面不得归零）', () => {
  assertScanAlive('harness 自省', {
    'harness 文件': scan.filesScanned,
    路径引用: scan.pathRefsChecked,
  });
});

/**
 * 元断言：**每一条守门都必须有心跳**。
 *
 * `assertScanAlive` 把约束放进了签名——但签名只管得住**用了它的人**。
 * 有人明天新写一条守门、根本不调用它，签名一句话也说不上。
 * 所以这里拿 package.json 的 `test:guards` 名单去逐个点名：
 * 进了守门名单，就必须调 assertScanAlive；否则这条守门可能哪天悄悄扫空而无人知晓。
 *
 * 这条元断言本身也在名单里，也调了 assertScanAlive（见上），不搞双标。
 */
test('元断言：test:guards 名单里的每条守门都必须调用 assertScanAlive', () => {
  const pkg = JSON.parse(readFileSync(join(FRONTEND_ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const cmd = pkg.scripts?.['test:guards'] ?? '';
  const listed = [...cmd.matchAll(/"([^"]*\.nodetest\.ts)"/g)].map((m) => m[1]);

  assert.ok(
    listed.length > 0,
    'test:guards 里没解析出任何守门文件——名单格式变了，本元断言已失效（它自己就是个空转的守门）。',
  );

  const withoutHeartbeat = listed.filter((rel) => {
    const full = join(FRONTEND_ROOT, rel);
    if (!existsSync(full)) return false; // 文件不存在由上面的路径断言负责报
    return !readFileSync(full, 'utf8').includes('assertScanAlive');
  });

  assert.deepEqual(
    withoutHeartbeat,
    [],
    '下列守门没有心跳检测——它们的扫描面若塌成 0，会永远绿着而无人知晓：\n  ' +
      withoutHeartbeat.join('\n  ') +
      `\n  修法：import { assertScanAlive } from '<相对路径>/src/lib/guards/scan-alive.ts'，` +
      '并在一个 test 里传入证明扫描跑过的计数（只传扫描面，别传发现数）。',
  );
});
