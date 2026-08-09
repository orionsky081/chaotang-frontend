/** Shared server-only response helpers for protected Court command BFFs. */
export function courtCommandFailure(
  status: number,
  code: string,
  message: string,
): Response {
  return Response.json(
    { success: false, data: null, error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function readCourtCommandJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error('invalid_upstream_json');
  }
}
