import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  await params;
  redirect('/departments');
}
