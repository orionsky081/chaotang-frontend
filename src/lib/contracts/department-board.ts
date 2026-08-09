export const DEPARTMENT_BOARD_CODES = [
  'finance',
  'ops',
  'gongbu',
  'legal',
  'market',
  'personnel',
] as const;

export type DepartmentBoardCode = (typeof DEPARTMENT_BOARD_CODES)[number];

export function isDepartmentBoardCode(value: string): value is DepartmentBoardCode {
  return DEPARTMENT_BOARD_CODES.some((code) => code === value);
}

export interface DepartmentBoardTask {
  id: string;
  title: string;
  command: string;
  status: string;
  updatedAt: string;
}

export interface DepartmentBoard {
  department: {
    code: DepartmentBoardCode;
    name: string;
    title: string;
  };
  tasks: DepartmentBoardTask[];
  headline: {
    taskId: string;
    title: string;
    status: string;
  } | null;
  stats: {
    total: number;
    active: number;
    reviewReady: number;
    archived: number;
  };
  sourceLabel: 'LIVE_BACKEND';
}
