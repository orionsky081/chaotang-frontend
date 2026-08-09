import { proxyBackendJsonRequest } from '@/lib/courtos/server-backend';

/** Compatibility transport only; authentication and validation run in FastAPI. */
export async function POST(request: Request): Promise<Response> {
  return proxyBackendJsonRequest(request, '/api/auth/login');
}
