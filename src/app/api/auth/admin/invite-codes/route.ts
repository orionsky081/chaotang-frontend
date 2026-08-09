import { proxyBackendJsonRequest } from '@/lib/courtos/server-backend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Compatibility transport only; admin policy and persistence run in FastAPI. */
export async function GET(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(request, '/api/invite-codes/list');
}

export async function POST(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(request, '/api/invite-codes/create');
}

export async function DELETE(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(
    request,
    `/api/invite-codes/revoke${new URL(request.url).search}`,
  );
}
