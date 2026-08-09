const OUTCOME_PREFIX = [
  'court',
  'shangshufang',
  'kernel',
  'runs',
] as const;

/** Raw authority mutations must be entered through a purpose-built same-origin BFF. */
export function isServerOnlyBackendMutation(
  method: string,
  parts: readonly string[],
): boolean {
  if (method.toUpperCase() !== 'POST' || parts.length !== 6) return false;
  if (!OUTCOME_PREFIX.every((part, index) => parts[index] === part)) return false;
  return parts[5] === 'outcomes';
}
