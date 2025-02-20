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
    alias: {
      '@': '/src',
      'buffer': 'buffer',
      '@solana/wallet-adapter-react-ui/styles.css': path.resolve(__dirname, 'node_modules/@solana/wallet-adapter-react-ui/styles.css'),
      'process': path.resolve(__dirname, 'node_modules/process/browser.js'),
      'stream': 'stream-browserify',
      'zlib': path.resolve(__dirname, 'node_modules/browserify-zlib'),
      'util': path.resolve(__dirname, 'node_modules/util'),
      'crypto': 'crypto-browserify',
      'path': 'path-browserify',
      'http': false,
      'https': false,
      'os': false,
      'fs': false,
      'net': false,
      'tls': false
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      },
      supported: {
        bigint: true
      }
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
    'process.version': '"v16.0.0"',
    'process.versions': JSON.stringify({
      node: '16.0.0'
    }),
    'process.platform': '"browser"',
    'process.env.NODE_DEBUG': 'false'
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