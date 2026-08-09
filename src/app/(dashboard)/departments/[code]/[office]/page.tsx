import { notFound, redirect } from 'next/navigation';
import { isDepartmentBoardCode } from '@/lib/contracts/department-board';

type DepartmentOfficePageProps = {
  params: Promise<{ code: string; office: string }>;
};

export default async function DepartmentOfficeSubpage({ params }: DepartmentOfficePageProps) {
  const { code } = await params;
  if (code === 'libu') redirect('/departments/market');
  if (code === 'works') redirect('/departments/gongbu');
  if (!isDepartmentBoardCode(code)) notFound();
  redirect(`/departments/${code}`);
}
