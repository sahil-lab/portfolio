import { defineConfig } from 'vite';
import vinext from 'vinext';
import { nitro } from 'nitro/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFile } from 'node:fs/promises';

export async function deduplicateTracedPackages(packages: Record<string, { versions: Record<string, { files: string[] }> }>) {
  for (const [name, entry] of Object.entries(packages)) {
    for (const [version, traced] of Object.entries(entry.versions)) {
      const destinations = new Map<string, string>();
      for (const source of traced.files) {
        const normalized = source.replaceAll('\\', '/'), marker = '/node_modules/' + name + '/';
        const offset = normalized.lastIndexOf(marker);
        const destination = offset < 0 ? normalized : normalized.slice(offset + marker.length);
        const previous = destinations.get(destination);
        if (previous) {
          if (previous !== source) {
            const [original, duplicate] = await Promise.all([readFile(previous), readFile(source)]);
            if (!original.equals(duplicate)) throw new Error(`Conflicting traced files for ${name}@${version}/${destination}`);
          }
        } else destinations.set(destination, source);
      }
      traced.files = [...destinations.values()];
    }
  }
}

// Separate adapter: the existing Sites/Cloudflare build remains in vite.config.ts.
export default defineConfig({
  plugins: [tailwindcss(), vinext(), nitro({ preset: 'vercel', traceOpts: { hooks: { tracedPackages: deduplicateTracedPackages } } })],
});
