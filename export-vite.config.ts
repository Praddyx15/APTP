import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// This Vite config is used for deployment outside of Replit
// It removes all Replit-specific plugins and configuration
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@components': path.resolve(__dirname, './client/src/components'),
      '@lib': path.resolve(__dirname, './client/src/lib'),
      '@pages': path.resolve(__dirname, './client/src/pages'),
      '@hooks': path.resolve(__dirname, './client/src/hooks'),
      '@assets': path.resolve(__dirname, './client/src/assets'),
      '@styles': path.resolve(__dirname, './client/src/styles'),
      '@types': path.resolve(__dirname, './types'),
    },
  },
  server: {
    // Proxy API requests during development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wouter', 'three'],
  },
})