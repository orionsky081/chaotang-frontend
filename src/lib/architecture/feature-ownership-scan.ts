import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE = /(?:\.nodetest|\.itest|\.test|\.spec)\.[^.]+$/;

export const RETIRED_FEATURE_ALIASES = [
  '@/features/shiguan-ui',
  '@/features/jinyiwei',
] as const;

export const FEATURE_STATUSES = ['active', 'legacy', 'shared'] as const;
export type FeatureStatus = typeof FEATURE_STATUSES[number];

export interface FeatureRegistration {
  owner: string;
  publicEntry: string;
  status: FeatureStatus;
  migrationTarget?: string;
  deadlineVersion?: string;
}

/** Machine-readable feature ownership registry. New top-level directories require an explicit entry. */
export const FEATURE_REGISTRY = {
  auth: { owner: 'frontend:auth', publicEntry: 'index.ts (AuthShell)', status: 'active' },
  bingbu: { owner: 'frontend:bingbu', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  bureaus: { owner: 'frontend:bureaus', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  'command-center': { owner: 'frontend:command-center', publicEntry: 'index.ts (views and DTOs)', status: 'active' },
  coronation: { owner: 'frontend:coronation', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  'court-console': { owner: 'frontend:court-console', publicEntry: 'index.ts (SystemVitals)', status: 'active' },
  'court-shell': { owner: 'frontend:court-shell', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  dadian: { owner: 'frontend:dadian', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  departments: { owner: 'frontend:departments', publicEntry: 'index.ts (department views)', status: 'active' },
  forecast: { owner: 'frontend:forecast', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  gongbu: { owner: 'frontend:gongbu', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  governance: { owner: 'frontend:governance', publicEntry: 'index.ts (views)', status: 'active' },
  hanlin: { owner: 'frontend:hanlin', publicEntry: 'index.ts (pages)', status: 'active' },
  health: { owner: 'frontend:health', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  hubu: { owner: 'frontend:hubu', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  imperial: { owner: 'frontend:imperial', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  intel: { owner: 'frontend:intel', publicEntry: 'index.ts (IntelPage)', status: 'active' },
  'landing-merge': { owner: 'frontend:landing-merge', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  landing: { owner: 'frontend:landing', publicEntry: 'components/WelcomeLanding', status: 'active' },
  learning: { owner: 'frontend:learning', publicEntry: 'index.ts (LiveBacktest)', status: 'active' },
  libu: { owner: 'frontend:libu', publicEntry: 'index.ts', status: 'active' },
  lifu: { owner: 'frontend:lifu', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  'operating-loop': { owner: 'frontend:operating-loop', publicEntry: 'index.ts (BuildLedger)', status: 'active' },
  qintian: { owner: 'frontend:qintian', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  qintianjian: { owner: 'frontend:qintianjian', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  reports: { owner: 'frontend:reports', publicEntry: 'index.ts (views and report DTOs)', status: 'active' },
  shangshufang: { owner: 'frontend:shangshufang', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  shared: { owner: 'frontend:shared', publicEntry: 'components/', status: 'shared' },
  shiguan: { owner: 'frontend:shiguan', publicEntry: 'components/ShiguanPage', status: 'active' },
  start: { owner: 'frontend:start', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  throne: { owner: 'frontend:throne', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  welcome: { owner: 'frontend:welcome', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  xingbu: { owner: 'frontend:xingbu', publicEntry: 'route-owned', status: 'legacy', migrationTarget: 'promote a public entry or merge into canonical owner', deadlineVersion: 'v0.2' },
  zhuangyuan: { owner: 'frontend:zhuangyuan', publicEntry: 'index.ts (DepartmentsHallPage)', status: 'active' },
} as const satisfies Record<string, FeatureRegistration>;

export const REGISTERED_FEATURE_DIRECTORIES = Object.keys(FEATURE_REGISTRY);
const REGISTERED_FEATURE_DIRECTORY_SET = new Set<string>(REGISTERED_FEATURE_DIRECTORIES);

export interface RetiredFeatureImportViolation {
  file: string;
  retiredAlias: typeof RETIRED_FEATURE_ALIASES[number];
}

export interface FeatureRegistryViolation {
  directory: string;
  field: 'owner' | 'publicEntry' | 'status' | 'migrationTarget' | 'deadlineVersion';
  message: string;
}

type FeatureRegistrationInput = {
  owner?: string;
  publicEntry?: string;
  status?: string;
  migrationTarget?: string;
  deadlineVersion?: string;
};

export function validateFeatureRegistry(
  registry: Record<string, FeatureRegistrationInput> = FEATURE_REGISTRY,
): FeatureRegistryViolation[] {
  const allowedStatuses = new Set<string>(FEATURE_STATUSES);
  return Object.entries(registry).flatMap(([directory, entry]) => {
    const violations: FeatureRegistryViolation[] = [];
    if (!entry.owner?.trim()) violations.push({ directory, field: 'owner', message: 'owner is required' });
    if (!entry.publicEntry?.trim()) violations.push({ directory, field: 'publicEntry', message: 'publicEntry is required' });
    if (!entry.status || !allowedStatuses.has(entry.status)) {
      violations.push({ directory, field: 'status', message: `status must be one of ${FEATURE_STATUSES.join(', ')}` });
    }
    if (entry.status === 'legacy' && !entry.migrationTarget?.trim()) {
      violations.push({ directory, field: 'migrationTarget', message: 'legacy entries require a migrationTarget' });
    }
    if (entry.status === 'legacy' && !entry.deadlineVersion?.trim()) {
      violations.push({ directory, field: 'deadlineVersion', message: 'legacy entries require a deadlineVersion' });
    }
    return violations;
  });
}

export function scanFeatureDirectoryRegistry(frontendRoot: string): {
  scannedDirectories: number;
  unregisteredDirectories: string[];
} {
  const featuresRoot = join(frontendRoot, 'src/features');
  if (!existsSync(featuresRoot)) return { scannedDirectories: 0, unregisteredDirectories: [] };
  const directories = readdirSync(featuresRoot)
    .filter((entry) => statSync(join(featuresRoot, entry)).isDirectory())
    .sort();
  return {
    scannedDirectories: directories.length,
    unregisteredDirectories: directories.filter((entry) => !REGISTERED_FEATURE_DIRECTORY_SET.has(entry)),
  };
}

function walk(root: string, dir: string, files: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(root, full, files);
      continue;
    }
    const rel = relative(root, full).split(/[/\\]/).join('/');
    if (!SOURCE_EXT.test(entry) || TEST_FILE.test(entry) || entry.endsWith('.d.ts')) continue;
    files.push(rel);
  }
}

function importsAlias(source: string, alias: string): boolean {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const modulePath = `${escaped}(?:/[^'\"]*)?`;
  const staticImport = new RegExp(`(?:import|export)[\\s\\S]{0,300}?from\\s*['\"]${modulePath}['\"]`);
  const dynamicImport = new RegExp(`import\\s*\\(\\s*['\"]${modulePath}['\"]\\s*\\)`);
  return staticImport.test(source) || dynamicImport.test(source);
}

export function scanRetiredFeatureImports(frontendRoot: string): {
  scannedFiles: number;
  violations: RetiredFeatureImportViolation[];
} {
  const files: string[] = [];
  walk(frontendRoot, join(frontendRoot, 'src'), files);
  const violations = files.flatMap((file) => {
    const source = readFileSync(join(frontendRoot, file), 'utf8');
    return RETIRED_FEATURE_ALIASES
      .filter((alias) => importsAlias(source, alias))
      .map((retiredAlias) => ({ file, retiredAlias }));
  });
  return { scannedFiles: files.length, violations };
}
