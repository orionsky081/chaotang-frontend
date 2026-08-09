/** Strict browser mutation boundary for cookie-backed same-origin BFF routes. */
export function sameOriginMutationError(request: Request): Response | null {
  const expectedOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (suppliedOrigin !== expectedOrigin || fetchSite !== 'same-origin') {
    return Response.json(
      {
        success: false,
        data: null,
        error: {
          code: 'same_origin_required',
          message: '朝堂命令必须来自当前同源页面。',
        },
      },
      { status: 403 },
    );
  }
  return null;
}
