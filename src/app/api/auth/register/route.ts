import { proxyBackendJsonRequest } from '@/lib/courtos/server-backend';

/** Compatibility transport only; registration policy and writes run in FastAPI. */
export async function POST(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(request, '/api/auth/register');
}
