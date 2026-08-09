import { VerdictSharePage } from '@/features/shared/components/verdict-share-page';
import { decodeVerdictCardPayload } from '@/features/shared/lib/verdict-share';

export default async function SharedVerdictPage({
  searchParams,
}: {
  searchParams: Promise<{ payload?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawPayload = Array.isArray(params.payload) ? params.payload[0] : params.payload;
  const data = decodeVerdictCardPayload(rawPayload);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04060E] px-6 text-center text-[#F43F5E]">
        此朱批卡分享链接无效、已损坏或已被裁剪
      </div>
    );
  }

  return <VerdictSharePage data={data} />;
}

