/**
 * This is a build-time fix for TypeScript errors in Vite build.
 * This file is meant to be included in the build process to patch import paths.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Path to the vite.config.ts file
const viteConfigPath = resolve('vite.config.ts');

// Read the existing config file
const existingConfig = readFileSync(viteConfigPath, 'utf8');

// Replace the broken imports
const fixedConfig = existingConfig
  .replace('// REMOVED REPLIT IMPORT;', "import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';")
  .replace('// REMOVED REPLIT IMPORT;', "import themePlugin from '@replit/vite-plugin-shadcn-theme-json';")
  .replace('undefined !== undefined', 'true');

// Write the fixed file
writeFileSync(viteConfigPath, fixedConfig);

console.log('Vite config fixed successfully!');

// Plugin system for rollup/vite
export default function viteFix() {
  return {
    name: 'vite-fix',
    resolveId(source, importer) {
      // Do not transform anything
      return null;
    },
    transform(code, id) {
      // No code transformation
      return null;
    }
  };
}