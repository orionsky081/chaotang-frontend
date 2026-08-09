/** One backend-projected metric shown on the manor/ministry overview. */
export interface ManorMinistryMetric {
  label: string;
  value: string;
  delta?: string;
  deltaPositive: boolean;
  updatedAt: string;
}

/** ministry key to backend-projected metrics. */
export type ManorMinistryMetricsMap = Record<string, ManorMinistryMetric[]>;
