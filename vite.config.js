import { defineConfig } from 'vite';

// GitHub Pages can't set headers, so CSP goes in a <meta> tag. Added at build
// time only: the dev server injects <style> tags, which this policy would block.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self'",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  // Never inline assets as data: URIs; the CSP only allows 'self' for fonts.
  build: { assetsInlineLimit: 0 },
  plugins: [
    {
      name: 'csp-meta',
      apply: 'build',
      transformIndexHtml: (html) =>
        html.replace(
          '<!-- csp -->',
          `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        ),
    },
  ],
  test: { include: ['src/**/*.test.js'], passWithNoTests: true },
});
