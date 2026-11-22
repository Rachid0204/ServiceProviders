import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const rootDir = import.meta.dirname;
const DEFAULT_SITE_ORIGIN = 'https://serviceproviders.vercel.app';

export default defineConfig(() => {
  const configuredSiteUrl = process.env.VITE_SITE_URL?.trim().replace(/\/+$/, '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Allows overriding canonical / OG / JSON-LD origin cleanly via VITE_SITE_URL on Vercel
      {
        name: 'inject-site-origin-meta',
        transformIndexHtml(html: string): string {
          if (!configuredSiteUrl || configuredSiteUrl === DEFAULT_SITE_ORIGIN) {
            return html;
          }
          return html.split(DEFAULT_SITE_ORIGIN).join(configuredSiteUrl);
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor-react',
                test: /node_modules\/(react|react-dom|scheduler|lucide-react)\//,
                priority: 30,
              },
              {
                name: 'vendor-firebase',
                test: /node_modules\/(@?firebase)\//,
                priority: 25,
              },
              {
                name: 'vendor-leaflet',
                test: /node_modules\/leaflet\//,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
