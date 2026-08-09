import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertScanAlive } from '../guards/scan-alive.ts';
import {
  scanFeatureDirectoryRegistry,
  scanRetiredFeatureImports,
  validateFeatureRegistry,
} from './feature-ownership-scan.ts';

const FRONTEND_ROOT = fileURLToPath(new URL('../../..', import.meta.url));

test('领域归属：退役 feature 目录不得被重新导入', () => {
  const result = scanRetiredFeatureImports(FRONTEND_ROOT);
  assert.deepEqual(
    result.violations,
    [],
    `已退役 feature 路径被重新引用：\n${result.violations.map((item) => `${item.file} → ${item.retiredAlias}`).join('\n')}`,
  );
});

test('领域归属：新增 feature 顶层目录必须登记', () => {
  const result = scanFeatureDirectoryRegistry(FRONTEND_ROOT);
  assert.deepEqual(
    result.unregisteredDirectories,
    [],
    `未登记的 feature 顶层目录：${result.unregisteredDirectories.join(', ')}`,
  );
});

test('领域归属：每个登记项必须声明 owner、publicEntry、status', () => {
  assert.deepEqual(validateFeatureRegistry(), []);
});

test('领域归属：心跳（扫描面不得归零）', () => {
  const result = scanRetiredFeatureImports(FRONTEND_ROOT);
  const directories = scanFeatureDirectoryRegistry(FRONTEND_ROOT);
  assertScanAlive('领域归属守卫', {
    'active src 文件': result.scannedFiles,
    'feature 顶层目录': directories.scannedDirectories,
  });
});

interface Attack {
  name: string;
  file: string;
  source: string;
}

/** 已知绕过手法，只增不减。 */
const ATTACKS: Attack[] = [
  {
    name: '静态导入退役史馆目录',
    file: 'src/app/archive/page.tsx',
    source: "import ShiguanPage from '@/features/shiguan-ui/components/ShiguanPage';\nexport default ShiguanPage;\n",
  },
  {
    name: '转导出退役史馆目录',
    file: 'src/features/archive/index.ts',
    source: "export { default as ShiguanPage } from '@/features/shiguan-ui/components/ShiguanPage';\n",
  },
  {
    name: '动态导入退役锦衣卫目录',
    file: 'src/features/intel/legacy-loader.ts',
    source: "export const load = () => import('@/features/jinyiwei/JinyiweiPage');\n",
  },
];

for (const attack of ATTACKS) {
  test(`领域归属攻击集：${attack.name} —— 必须被拦下`, () => {
    const root = mkdtempSync(join(tmpdir(), 'feature-ownership-attack-'));
    try {
      const full = join(root, attack.file);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, attack.source, 'utf8');
      const result = scanRetiredFeatureImports(root);
      assert.equal(result.violations.length, 1, `攻击绕过了领域归属守卫：${attack.name}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('领域归属攻击集：心跳（攻击资产不得被清空）', () => {
  assertScanAlive('领域归属攻击集', { 已知绕过手法: ATTACKS.length });
});

const DIRECTORY_ATTACKS = [
  'src/features/sneaky',
  'src/features/sneaky/components',
  'src/features/.shadow',
] as const;

for (const directory of DIRECTORY_ATTACKS) {
  test(`领域目录攻击集：未登记目录 ${directory} —— 必须被拦下`, () => {
    const root = mkdtempSync(join(tmpdir(), 'feature-directory-attack-'));
    try {
      mkdirSync(join(root, directory), { recursive: true });
      const result = scanFeatureDirectoryRegistry(root);
      assert.ok(result.unregisteredDirectories.length > 0, `攻击绕过了目录登记守卫：${directory}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('领域目录攻击集：心跳（攻击资产不得被清空）', () => {
  assertScanAlive('领域目录攻击集', { 已知绕过手法: DIRECTORY_ATTACKS.length });
});

const METADATA_ATTACKS = [
  { name: '空 owner', registration: { owner: '', publicEntry: 'index.ts', status: 'active' } },
  { name: '空 publicEntry', registration: { owner: 'frontend:sneaky', publicEntry: '', status: 'active' } },
  { name: '未知 status', registration: { owner: 'frontend:sneaky', publicEntry: 'index.ts', status: 'experimental' } },
] as const;

for (const attack of METADATA_ATTACKS) {
  test(`领域元数据攻击集：${attack.name} —— 必须被拦下`, () => {
    const violations = validateFeatureRegistry({ sneaky: attack.registration });
    assert.ok(violations.length > 0, `攻击绕过了领域元数据守卫：${attack.name}`);
  });
}

test('领域元数据攻击集：心跳（攻击资产不得被清空）', () => {
  assertScanAlive('领域元数据攻击集', { 已知绕过手法: METADATA_ATTACKS.length });
});

const LEGACY_DEBT_ATTACKS = [
  { name: 'legacy 缺 migrationTarget', registration: { owner: 'frontend:sneaky', publicEntry: 'route-owned', status: 'legacy', deadlineVersion: 'v0.2' } },
  { name: 'legacy 缺 deadlineVersion', registration: { owner: 'frontend:sneaky', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'merge into intel' } },
  { name: 'legacy 用空白 migrationTarget', registration: { owner: 'frontend:sneaky', publicEntry: 'route-owned', status: 'legacy', migrationTarget: '   ', deadlineVersion: 'v0.2' } },
] as const;

for (const attack of LEGACY_DEBT_ATTACKS) {
  test(`legacy 债务攻击集：${attack.name} —— 必须被拦下`, () => {
    const violations = validateFeatureRegistry({ sneaky: attack.registration });
    assert.ok(violations.length > 0, `攻击绕过了 legacy 债务守卫：${attack.name}`);
  });
}

test('legacy 债务攻击集：心跳（攻击资产不得被清空）', () => {
  assertScanAlive('legacy 债务攻击集', { 已知绕过手法: LEGACY_DEBT_ATTACKS.length });
});
