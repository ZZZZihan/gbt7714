import type { APIRoute } from 'astro';
import { GUIDES, LAST_VERIFIED_DATE, absoluteUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const pages = [
    { loc: absoluteUrl('/'), lastmod: LAST_VERIFIED_DATE, priority: '1.0' },
    ...GUIDES.map((g) => ({
      loc: absoluteUrl(g.path),
      lastmod: g.updatedAt,
      priority: '0.9',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <priority>${p.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
