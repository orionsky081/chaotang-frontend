const COURT_RUN_COMMAND_PREFIX = [
  'court',
  'shangshufang',
  'kernel',
  'runs',
] as const;

/** Bearer-bearing backend endpoints that browsers may reach only via a specific BFF. */
export function isServerOnlyBackendPath(parts: readonly string[]): boolean {
  if (parts.length !== 6) return false;
  if (!COURT_RUN_COMMAND_PREFIX.every((part, index) => parts[index] === part)) {
    return false;
  }
  return parts[5] === 'decision-challenge'
    || parts[5] === 'decision'
    || parts[5] === 'archive-challenge'
    || parts[5] === 'archive';
}
