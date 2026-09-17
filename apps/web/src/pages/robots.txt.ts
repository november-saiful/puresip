import type { APIRoute } from 'astro';

const GET: APIRoute = () => {
  const site = 'https://puresip.pages.dev';
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${site}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain' } },
  );
};

export { GET };
