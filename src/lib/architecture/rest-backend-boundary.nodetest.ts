import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertScanAlive } from '../guards/scan-alive.ts';
import { scanFrontendBoundary } from './rest-backend-boundary-scan.ts';

const FRONTEND_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const result = scanFrontendBoundary(FRONTEND_ROOT);

test('架构边界：前端无业务持久化、非 REST 通道、直连上游或业务运行时', () => {
  const lines = result.violations.map(
    (item) => `${item.file} → ${item.kind}: ${item.evidence}`,
  );
  assert.deepEqual(
    lines,
    [],
    '严格边界要求：浏览器 → 同源 JSON REST → 薄 BFF → FastAPI；业务、持久化、' +
      `上游与长任务全部归后端。命中 ${lines.length} 项：\n  ${lines.join('\n  ')}`,
  );
});

test('架构边界：心跳（扫描面不得归零）', () => {
  assertScanAlive('REST 后端边界', {
    'active src 文件': result.scannedFiles,
  });
});
