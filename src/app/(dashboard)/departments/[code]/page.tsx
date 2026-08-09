import { notFound, redirect } from 'next/navigation';
import { DepartmentPageRouteClient } from '@/features/departments';
import {
  DEPARTMENT_BOARD_CODES,
  isDepartmentBoardCode,
} from '@/lib/contracts/department-board';

type DepartmentPageProps = {
  params: Promise<{ code: string }>;
};

export function generateStaticParams() {
  return DEPARTMENT_BOARD_CODES.map((code) => ({ code }));
}

export default async function DepartmentSubpage({ params }: DepartmentPageProps) {
  const { code } = await params;
  if (code === 'guard') redirect('/intel');
  if (code === 'libu') redirect('/departments/market');
  if (code === 'works') redirect('/departments/gongbu');
  if (!isDepartmentBoardCode(code)) notFound();
  return <DepartmentPageRouteClient code={code} />;
}
