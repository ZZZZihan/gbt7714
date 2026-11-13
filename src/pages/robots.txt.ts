import type { APIRoute } from 'astro';
import { getSiteUrl } from '../lib/site';

export const GET: APIRoute = () => {
  const siteUrl = getSiteUrl();
  const bots = [
    '*',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Perplexity-User',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'Googlebot',
    'Google-Extended',
    'Bingbot',
    'Bytespider',
    'Baiduspider',
    'Sogou web spider',
    'YisouSpider',
  ];

  const rules = bots.map((ua) => `User-agent: ${ua}\nAllow: /`).join('\n\n');
  const body = `${rules}\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
