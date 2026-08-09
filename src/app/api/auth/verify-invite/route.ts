import { proxyBackendJsonRequest } from '@/lib/courtos/server-backend';

/** Compatibility transport only; invite validation and usage accounting are backend-owned. */
export async function POST(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(request, '/api/invite-codes/verify');
}
