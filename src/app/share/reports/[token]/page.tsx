import { redirect } from 'next/navigation';

/** Public-token transport was retired; report access now uses the authenticated REST resource. */
export default async function SharedReportRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/reports/${encodeURIComponent(token)}`);
}
