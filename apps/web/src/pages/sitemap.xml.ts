import type { APIRoute } from 'astro';

const site = 'https://puresip.pages.dev';

const staticPaths = [
  '',
  '/shop',
  '/about',
  '/faq',
  '/contact',
  '/cart',
  '/checkout',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refunds',
];

const productSlugs = [
  'puresip-bottle-500ml',
  'puresip-bottle-750ml',
  'puresip-tumbler-400ml',
  'puresip-straw-lid',
  'puresip-carry-loop',
  'puresip-brush-kit',
  'puresip-sports-cap',
  'puresip-mini-350ml',
];

const GET: APIRoute = () => {
  const urls = [
    ...staticPaths.map((p) => `${site}${p}`),
    ...productSlugs.map((s) => `${site}/product/${s}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};

export { GET };
