import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const readEnvironmentFile = (fileName) => {
  const filePath = join(projectRoot, fileName);
  if (!existsSync(filePath)) return {};

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || match[1].startsWith('#')) return values;

      values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      return values;
    }, {});
};

const environment = {
  ...readEnvironmentFile('.env'),
  ...readEnvironmentFile('.env.local'),
  ...process.env,
};

const siteUrl = String(environment.VITE_SITE_URL || '').replace(/\/$/, '');

if (!siteUrl) {
  throw new Error(
    'Set VITE_SITE_URL in .env before running npm run generate:sitemap.'
  );
}

const routes = [
  ['/', '1.0'],
  ['/shop', '0.9'],
  ['/collections', '0.8'],
  ['/about', '0.7'],
  ['/blog', '0.8'],
  ['/contact', '0.7'],
];

const urls = routes
  .map(
    ([path, priority]) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

writeFileSync(join(projectRoot, 'public', 'sitemap.xml'), sitemap);
writeFileSync(join(projectRoot, 'public', 'robots.txt'), robots);

console.log(`Generated sitemap and robots.txt for ${siteUrl}`);
