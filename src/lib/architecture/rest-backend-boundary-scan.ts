import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type BoundaryViolationKind =
  | 'frontend-filesystem-write'
  | 'browser-business-persistence'
  | 'non-rest-transport'
  | 'direct-upstream'
  | 'direct-business-http'
  | 'frontend-business-runtime';

export interface BoundaryViolation {
  file: string;
  kind: BoundaryViolationKind;
  evidence: string;
}

const SOURCE_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /(?:\.nodetest|\.itest|\.test|\.spec)\.[^.]+$/;

/**
 * These paths hold browser-only identity or presentation preferences. They are
 * explicitly not allowed to store business records, decisions, reports or audit
 * evidence. Keeping the allow-list path based makes every new storage owner a
 * reviewable architecture change.
 */
const UI_STORAGE_PATHS = new Set([
  'src/app/intro/page.tsx',
  'src/lib/auth.ts',
]);

const DIRECT_BACKEND_OWNER = 'src/lib/courtos/server-backend.ts';
const DIRECT_HTTP_REQUEST_OWNERS = new Set([
  'src/lib/api/index.ts',
  'src/lib/api/clients/reports.ts',
  'src/lib/api/clients/chaotang.ts',
  'src/lib/api/gateway.ts',
  'src/lib/auth.ts',
  'src/lib/courtos/server-backend.ts',
]);

const DIRECT_UPSTREAM_MARKERS = [
  'ANTHROPIC_API_KEY',
  'COURTOS_API_URL',
  'COURTOS_LEGACY',
  'DEEPSEEK_API_KEY',
  'LEGAL_AGENT_URL',
  'LEGAL_AGENT',
  'LLM_GATEWAY',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'QINTIAN_API_URL',
];

/**
 * LLM SDK 包（2026-07-23 立 · 架构定调）。前端只做 REST 客户端，所有 LLM 调用在后端。
 *
 * 已有规则拦住两条 LLM 复长路径：`core/courtos|lib/llm` 内部 runtime import（frontend-business-runtime）、
 * 直连绝对地址 fetch（direct-upstream）。但**第三条**看不见：`import OpenAI from 'openai'` ——
 * SDK 在包内部发请求，绝对-URL 正则扫不到，包名又不在 core/courtos 里。这份名单补上它。
 * 名单只增不减：少一个 = 一扇后门。四种形态（from / require / 动态 import / 子路径导出）都认。
 */
const LLM_SDK_PACKAGES = [
  'openai',
  '@anthropic-ai/sdk',
  '@anthropic-ai/bedrock-sdk',
  '@anthropic-ai/vertex-sdk',
  '@google/generative-ai',
  '@google/genai',
  '@mistralai/mistralai',
  'cohere-ai',
  'groq-sdk',
  'replicate',
  'together-ai',
  'langchain',
  '@langchain/core',
  '@langchain/openai',
  'llamaindex',
  'ollama',
  '@ai-sdk/openai',
  '@ai-sdk/anthropic',
];
const LLM_SDK_IMPORT = new RegExp(
  `(?:from\\s+|require\\(\\s*|import\\(\\s*)['"\`](?:${LLM_SDK_PACKAGES.map(
    (p) => p.replace(/[/@-]/g, '\\$&'),
  ).join('|')})(?:/[^'"\`]*)?['"\`]`,
);

const DOMAIN_FUNCTION = /\b(?:export\s+)?function\s+(?:classify|calculate|compute|evaluate|rank|decide|derive|aggregate)[A-Za-z0-9_]*\s*\(/;
const DOMAIN_RULE_CONSTANT = /\b(?:const|let|var)\s+(?:[A-Z0-9_]*TRANSITIONS?|[A-Z0-9_]*(?:SCORING|DECISION|RISK)_WEIGHTS?|[A-Z0-9_]*(?:SCORE|DECISION|RISK)_THRESHOLDS?|weightedScore)\b/;
const DOMAIN_TIME_RULE =
  /\b(?:(?:STUCK|TAKEOVER|ESCALATION)(?:_[A-Z0-9]+)*_THRESHOLD(?:_MS)?|function\s+(?:isStuck|needsTakeover|shouldEscalate)\s*\()/;
const DOMAIN_CONFIDENCE_SELECTION =
  /(?:\brecommendedCategories\b[\s\S]{0,600}?\.(?:reduce|sort|toSorted)\s*\([\s\S]{0,600}?\bconfidence\b|\bMath\.max\s*\([\s\S]{0,400}?\brecommendedCategories\b[\s\S]{0,400}?\bconfidence\b)/;
const DOMAIN_STATUS_MUTATION =
  /\bset[A-Z][A-Za-z0-9_]*\s*\(\s*\{[\s\S]{0,320}?\.\.\.[\s\S]{0,320}?\bstatus\s*:\s*['"](?:approved|archived|blocked|completed|failed|reviewed|running)['"]/;
const BUSINESS_FACT_FIELDS = [
  'amount',
  'caseId',
  'confidence',
  'createdAt',
  'owner',
  'progressPct',
  'riskLevel',
  'score',
  'stage',
  'status',
  'taskId',
  'updatedAt',
  'verdict',
];

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

function exposeSimpleStringConcatenation(source: string): string {
  let current = source;
  for (let i = 0; i < 4; i += 1) {
    const next = current.replace(
      /(['"])([^'"\n]*)\1\s*\+\s*(['"])([^'"\n]*)\3/g,
      (_all, _q1: string, left: string, _q2: string, right: string) => `'${left}${right}'`,
    );
    if (next === current) break;
    current = next;
  }
  return current;
}

function push(
  out: BoundaryViolation[],
  file: string,
  kind: BoundaryViolationKind,
  evidence: string,
): void {
  if (!out.some((item) => item.file === file && item.kind === kind && item.evidence === evidence)) {
    out.push({ file, kind, evidence });
  }
}

function hasStaticBusinessFacts(source: string): boolean {
  const collection = /\bexport\s+const\s+[A-Z][A-Z0-9_]*[^=\n]*=\s*\[/g;
  for (const match of source.matchAll(collection)) {
    const start = match.index ?? 0;
    const terminator = source.indexOf('];', start);
    const snippet = source.slice(start, terminator >= 0 ? terminator + 2 : start + 2_000);
    const fields = BUSINESS_FACT_FIELDS.filter((field) =>
      new RegExp(`\\b${field}\\s*:`).test(snippet),
    );
    if (fields.length >= 2) return true;
  }
  return false;
}

export function scanBoundarySource(file: string, rawSource: string): BoundaryViolation[] {
  const out: BoundaryViolation[] = [];
  const source = exposeSimpleStringConcatenation(stripComments(rawSource));

  const importsNodeFs = /(?:from\s*['"](?:node:)?fs(?:\/promises)?['"]|require\(\s*['"](?:node:)?fs(?:\/promises)?['"]\s*\))/.test(
    source,
  );
  const fsWritePrimitive =
    /\b(?:appendFile|appendFileSync|createWriteStream|mkdirSync|renameSync|rmSync|unlinkSync|writeFile|writeFileSync)\b/.test(
      source,
    ) ||
    /\bopen(?:Sync)?\s*\([^\n,]+,\s*['"](?:a|ax|a\+|w|wx|w\+)['"]/.test(source) ||
    /\bopen\b[\s\S]{0,240}\bappendFile\b/.test(source);
  if (importsNodeFs && fsWritePrimitive) {
    push(out, file, 'frontend-filesystem-write', 'node:fs write primitive');
  }

  if (/\b(?:localStorage|sessionStorage)\b/.test(source) && !UI_STORAGE_PATHS.has(file)) {
    push(out, file, 'browser-business-persistence', 'localStorage/sessionStorage outside UI allow-list');
  }

  const transportMarkers: Array<[RegExp, string]> = [
    [/socket\.io-client/, 'socket.io-client'],
    [/\bEventSource\b|\[['"]EventSource['"]\]/, 'EventSource/SSE'],
    [/\bWebSocket\b/, 'WebSocket'],
    [/text\/event-stream/, 'text/event-stream response'],
  ];
  for (const [pattern, evidence] of transportMarkers) {
    if (pattern.test(source)) push(out, file, 'non-rest-transport', evidence);
  }

  for (const marker of DIRECT_UPSTREAM_MARKERS) {
    if (source.includes(marker)) push(out, file, 'direct-upstream', marker);
  }
  if (
    file !== DIRECT_BACKEND_OWNER &&
    /\bprocess\.env(?:\.[A-Z0-9_]*(?:API|BACKEND|GATEWAY|PROVIDER)[A-Z0-9_]*(?:URL|HOST)|\[['"][A-Z0-9_]*(?:API|BACKEND|GATEWAY|PROVIDER)[A-Z0-9_]*(?:URL|HOST)['"]\])/.test(source)
  ) {
    push(out, file, 'direct-upstream', 'backend/provider address outside the sole BFF transport');
  }
  if (file !== DIRECT_BACKEND_OWNER && source.includes('JIQUN_API_URL')) {
    push(out, file, 'direct-upstream', 'JIQUN_API_URL outside the sole BFF transport');
  }
  if (
    !DIRECT_HTTP_REQUEST_OWNERS.has(file)
    && /\b(?:fetch|authedFetch)\s*\(\s*(?:withBasePath\(\s*)?(?:['"]\/api|`[^`]*\/api)/.test(source)
  ) {
    push(out, file, 'direct-business-http', 'direct fetch/authedFetch to /api from business/runtime file');
  }
  if (/['"]\/jiqun\/api(?:\/|['"])/.test(source)) {
    push(out, file, 'direct-upstream', 'retired direct-backend proxy path /jiqun/api');
  }
  if (/['"]\/socket\.io(?:\/|['"])/.test(source)) {
    push(out, file, 'non-rest-transport', 'retired Socket.IO proxy path');
  }
  if (/\bfetch\s*\(\s*['"]https?:\/\//.test(source)) {
    push(out, file, 'direct-upstream', 'absolute URL fetch');
  }
  if (/\bnew\s+URL\s*\(\s*['"]https?:\/\//.test(source)) {
    push(out, file, 'direct-upstream', 'absolute URL construction');
  }
  if (
    /(?:from\s*['"]node:https?['"]|require\(\s*['"]node:https?['"]\s*\))/.test(source)
    && /\b(?:request|get)\s*\(/.test(source)
  ) {
    push(out, file, 'direct-upstream', 'node http client');
  }
  if (/(?:127\.0\.0\.1|localhost):(?:18001|18003|8000|8001|9000)\b/.test(source)) {
    push(out, file, 'direct-upstream', 'legacy/provider service port');
  }

  const businessImport = /(?:import|export)(?!\s+type\b)[\s\S]{0,300}?from\s*['"][^'"]*(?:core\/courtos|lib\/llm)(?:\/[^'"]*)?['"]/g;
  if (businessImport.test(source)) {
    push(out, file, 'frontend-business-runtime', 'runtime import from core/courtos or lib/llm');
  }
  if (/import\s*\(\s*['"][^'"]*(?:core\/courtos|lib\/llm)(?:\/[^'"]*)?['"]\s*\)/.test(source)) {
    push(out, file, 'frontend-business-runtime', 'dynamic runtime import from core/courtos or lib/llm');
  }
  if (LLM_SDK_IMPORT.test(source)) {
    push(out, file, 'frontend-business-runtime', 'LLM SDK import in frontend (LLM calls belong to the backend)');
  }
  if (DOMAIN_FUNCTION.test(source)) {
    push(out, file, 'frontend-business-runtime', 'domain classifier/calculator in frontend runtime');
  }
  if (DOMAIN_RULE_CONSTANT.test(source)) {
    push(out, file, 'frontend-business-runtime', 'domain transitions/weights/thresholds in frontend runtime');
  }
  if (DOMAIN_TIME_RULE.test(source)) {
    push(out, file, 'frontend-business-runtime', 'business timeout/escalation rule in frontend runtime');
  }
  if (DOMAIN_CONFIDENCE_SELECTION.test(source)) {
    push(out, file, 'frontend-business-runtime', 'confidence-based dispatch selection in frontend runtime');
  }
  if (DOMAIN_STATUS_MUTATION.test(source)) {
    push(out, file, 'frontend-business-runtime', 'local domain status transition in frontend runtime');
  }
  if (hasStaticBusinessFacts(source)) {
    push(out, file, 'frontend-business-runtime', 'static collection masquerading as backend business facts');
  }

  return out;
}

function walk(root: string, dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(root, full).split(/[/\\]/).join('/');
    if (statSync(full).isDirectory()) {
      if (rel === 'src/lib/architecture') continue;
      walk(root, full, out);
      continue;
    }
    if (!SOURCE_EXT.test(entry) || TEST_FILE.test(entry) || entry.endsWith('.d.ts')) continue;
    out.push(full);
  }
}

export function scanFrontendBoundary(frontendRoot: string): {
  scannedFiles: number;
  violations: BoundaryViolation[];
} {
  const files: string[] = [];
  walk(frontendRoot, join(frontendRoot, 'src'), files);
  walk(frontendRoot, join(frontendRoot, 'public'), files);
  for (const stem of ['next.config', 'middleware', 'proxy', 'instrumentation']) {
    for (const ext of ['ts', 'js', 'mjs', 'cjs']) {
      const candidate = join(frontendRoot, `${stem}.${ext}`);
      if (existsSync(candidate)) files.push(candidate);
    }
  }
  const violations = files.flatMap((full) => {
    const rel = relative(frontendRoot, full).split(/[/\\]/).join('/');
    return scanBoundarySource(rel, readFileSync(full, 'utf8'));
  });
  return { scannedFiles: files.length, violations };
}
