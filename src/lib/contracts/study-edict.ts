import { z } from 'zod';

export const ZStudyQualityGate = z.object({
  status: z.enum(['passed', 'needs_review', 'blocked']),
  score: z.number(),
  reasons: z.array(z.string()),
  human_signoff_required: z.boolean(),
  repairAction: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const ZStudyDepartment = z
  .object({
    dept: z.string(),
    name: z.string(),
    opinion: z.string(),
    confidence: z.number(),
    status: z.string(),
    run_id: z.string().optional(),
  })
  .passthrough();

export const ZStudyEvidence = z
  .object({
    label: z.string(),
    value: z.string(),
    source: z.string(),
    score: z.number().optional(),
    severity: z.string().optional(),
  })
  .passthrough();

export const ZStudyNextAction = z
  .object({
    type: z.string(),
    label: z.string(),
    target: z.string(),
    owner: z.string(),
  })
  .passthrough();

export const ZStudyReplayArtifact = z
  .object({
    kind: z.string(),
    session_id: z.string(),
    path: z.string(),
    api_path: z.string(),
    owner: z.string(),
  })
  .passthrough();

export const ZStudyRunAdapter = z
  .object({
    name: z.string(),
    session_id: z.string(),
    entry_swarm: z.string(),
    status: z.string().optional(),
    run_count: z.number().optional(),
    completed_count: z.number().optional(),
    replay_artifact: ZStudyReplayArtifact,
  })
  .passthrough();

export const ZStudyOrchestration = z
  .object({
    tier: z.string(),
    value_thesis: z.string(),
    reason: z.string(),
  })
  .passthrough();

export const ZStudyEdict = z
  .object({
    run_id: z.string(),
    source_mode: z.enum(['LIVE', 'LIVE_SWARM', 'MIXED', 'FALLBACK', 'DEMO']),
    title: z.string(),
    verdict: z.string(),
    summary: z.string(),
    departments: z.array(ZStudyDepartment),
    evidence: z.array(ZStudyEvidence),
    risks: z.array(z.string()),
    next_actions: z.array(ZStudyNextAction),
    quality_gate: ZStudyQualityGate,
    run_adapter: ZStudyRunAdapter.optional(),
    orchestration: ZStudyOrchestration.optional(),
    run_status: z.string().optional(),
    async: z.boolean().optional(),
    provenance: z.string().optional(),
    source_label: z.string().optional(),
    created_at: z.string(),
  })
  .passthrough();

export const ZStudyRunResponse = z
  .object({
    taskId: z.string().optional(),
    status: z.string().optional(),
    isAsync: z.boolean().optional(),
    edict: ZStudyEdict,
    launchLoopCase: z.record(z.string(), z.unknown()).optional(),
    launchLoopGate: z.record(z.string(), z.unknown()).optional(),
    launchLoopArchive: z.record(z.string(), z.unknown()).optional(),
    idempotentReplay: z.boolean().optional(),
  })
  .passthrough();

export const ZStudyRunRequest = z.object({
  command: z.string().min(1),
  mode: z.enum(['dry_run', 'live']),
  taskId: z.string().optional(),
  entrySwarm: z.string().optional(),
  provider: z.string().optional(),
  asyncRun: z.boolean().optional(),
  idempotencyKey: z.string().optional(),
});

export type StudyEdict = z.infer<typeof ZStudyEdict>;
export type StudyRunResponse = z.infer<typeof ZStudyRunResponse>;
export type StudyRunRequest = z.infer<typeof ZStudyRunRequest>;
