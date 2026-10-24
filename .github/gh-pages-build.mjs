// Build-time patch for the GitHub Pages copy of this fork only.
// Upstream runs on adapter-node at the domain root; Pages serves it as a static
// SPA under /nostr-follow-list/, so this script (run only in the Pages workflow)
// swaps in adapter-static, adds the base path to links, and drops the
// crawler-only server hook. The repo's source files stay as upstream wrote them.
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_PATH || '/nostr-follow-list';

fs.writeFileSync('svelte.config.js', `import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', strict: false }),
    paths: { base: '${BASE}' }
  }
};
`);

// Single-page app: no server rendering, no prerender.
fs.writeFileSync('src/routes/+layout.ts', 'export const ssr = false;\nexport const prerender = false;\n');
if (fs.existsSync('src/hooks.server.ts')) fs.rmSync('src/hooks.server.ts');

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.svelte')) patch(p);
  }
}
function patch(file) {
  let s = fs.readFileSync(file, 'utf8');
  const before = s;
  s = s.replace(/(href|src)="\/(?!\/)/g, '$1="{base}/');
  s = s.replace(/goto\('\//g, "goto(base + '/");
  s = s.replace(/goto\(`\//g, 'goto(`${base}/');
  if (s !== before && !/from '\$app\/paths'/.test(s)) {
    s = s.replace(/<script([^>]*)>/, `<script$1>\n  import { base } from '$app/paths';`);
  }
  if (s !== before) { fs.writeFileSync(file, s); console.log('patched', file); }
}
walk('src');
