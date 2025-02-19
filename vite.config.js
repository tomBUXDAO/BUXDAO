import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import postcssPresetEnv from 'postcss-preset-env'

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
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
            console.log('Request Cookies:', req.headers.cookie);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
            console.log('Response Cookies:', proxyRes.headers['set-cookie']);
          });
        }
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
      '@solana/wallet-adapter-react-ui/styles.css': path.resolve(__dirname, 'node_modules/@solana/wallet-adapter-react-ui/styles.css'),
      'process': 'process/browser',
      'stream': 'stream-browserify',
      'zlib': 'browserify-zlib',
      'util': 'util'
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
      'buffer',
      '@solana/wallet-adapter-phantom'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
  },
  css: {
    modules: {
      localsConvention: 'camelCase'
    },
    devSourcemap: true,
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
        postcssPresetEnv({
          stage: 0,
          features: {
            'nesting-rules': true,
          }
        })
      ]
    }
  },
  publicDir: 'public',
  clearScreen: false,
  logLevel: 'info'
}) 