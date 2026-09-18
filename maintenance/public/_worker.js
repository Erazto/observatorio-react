// Keep all application routes and APIs in maintenance until the app is restored.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/dinosaurio.gif' || url.pathname === '/dinosaurio.png') {
      return env.ASSETS.fetch(request);
    }
    url.pathname = '/index.html';
    url.search = '';
    const page = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));
    const headers = new Headers(page.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('Retry-After', '3600');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(request.method === 'HEAD' ? null : page.body, { status: 503, headers });
  },
};
