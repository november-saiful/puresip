/**
 * Astro middleware — proxies /api/* to the API Worker so the browser sees
 * a single origin (no CORS, no cross-origin cookies).
 *
 * In dev mode the Vite proxy in astro.config.mjs already handles /api,
 * so this middleware is a no-op there.
 */
import { defineMiddleware } from 'astro:middleware';

const API_ORIGIN = 'https://puresip-api.november-saiful.workers.dev';

export const onRequest = defineMiddleware(async (context, next) => {
  // Only intercept /api/* requests
  if (!context.url.pathname.startsWith('/api/')) {
    return next();
  }

  // In dev mode the Vite proxy handles /api → localhost:8787
  if (import.meta.env.DEV) {
    return next();
  }

  // Build the target URL on the API Worker origin
  const targetUrl = new URL(
    context.url.pathname + context.url.search,
    API_ORIGIN,
  );

  // Forward the request, stripping hop-by-hop headers
  const proxyHeaders = new Headers(context.request.headers);
  proxyHeaders.delete('host');
  proxyHeaders.delete('connection');

  const proxyRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers: proxyHeaders,
    body:
      context.request.method !== 'GET' && context.request.method !== 'HEAD'
        ? context.request.body
        : undefined,
    // @ts-expect-error — redirect is valid on RequestInit in workerd
    redirect: 'follow',
  });

  const response = await fetch(proxyRequest);

  // Rewrite Set-Cookie headers so cookies land on the Pages origin
  // (the Worker sets Domain=<worker-host> which the browser would ignore
  //  on the pages.dev origin).
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const outHeaders = new Headers(response.headers);

  if (setCookies.length > 0) {
    outHeaders.delete('set-cookie');
    for (const cookie of setCookies) {
      // Strip Domain= so the cookie is scoped to the current (Pages) origin
      outHeaders.append('set-cookie', cookie.replace(/;\s*Domain=[^;]*/gi, ''));
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
});
