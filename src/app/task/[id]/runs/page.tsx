import { redirect } from 'next/navigation';

export default async function TaskRunsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/task/${encodeURIComponent(id)}`);
}
