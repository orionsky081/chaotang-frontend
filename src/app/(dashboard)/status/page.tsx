import { SystemVitals } from '@/features/court-console';

export const dynamic = 'force-dynamic';

export default function StatusPage() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(240,198,106,0.06), transparent 30%)' }}>
      <SystemVitals />
    </main>
  );
}
