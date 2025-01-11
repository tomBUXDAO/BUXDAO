import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Explicitly configure Fast Refresh
      fastRefresh: true,
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    },
    watch: {
      usePolling: true
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': '/src',
      'buffer': 'buffer/',
      '@solana/wallet-adapter-react-ui/styles.css': path.resolve(__dirname, 'node_modules/@solana/wallet-adapter-react-ui/styles.css')
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-wallets',
      '@solana/web3.js',
      'buffer'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  define: {
    'process.env': {},
    'global': {},
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    devSourcemap: true
  },
  publicDir: 'public',
  clearScreen: false,
  logLevel: 'info'
}) 