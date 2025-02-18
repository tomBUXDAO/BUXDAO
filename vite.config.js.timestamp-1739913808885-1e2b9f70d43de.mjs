// vite.config.js
import { defineConfig } from "file:///Users/tombuxdao/BUXDAO3.0/node_modules/vite/dist/node/index.js";
import react from "file:///Users/tombuxdao/BUXDAO3.0/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import tailwindcss from "file:///Users/tombuxdao/BUXDAO3.0/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///Users/tombuxdao/BUXDAO3.0/node_modules/autoprefixer/lib/autoprefixer.js";
import postcssPresetEnv from "file:///Users/tombuxdao/BUXDAO3.0/node_modules/postcss-preset-env/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/tombuxdao/BUXDAO3.0";
var vite_config_default = defineConfig({
  plugins: [
    react({
      // Explicitly configure Fast Refresh
      fastRefresh: true
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request:", req.method, req.url);
            console.log("Request Cookies:", req.headers.cookie);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response:", proxyRes.statusCode, req.url);
            console.log("Response Cookies:", proxyRes.headers["set-cookie"]);
          });
        }
      }
    },
    watch: {
      usePolling: true
    },
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173
    }
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: void 0
      }
    }
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
    alias: {
      "@": "/src",
      "buffer": "buffer/",
      "@solana/wallet-adapter-react-ui/styles.css": path.resolve(__vite_injected_original_dirname, "node_modules/@solana/wallet-adapter-react-ui/styles.css")
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@solana/wallet-adapter-base",
      "@solana/wallet-adapter-wallets",
      "@solana/web3.js",
      "buffer"
    ],
    esbuildOptions: {
      target: "esnext"
    }
  },
  define: {
    "process.env": {},
    "global": {}
  },
  css: {
    modules: {
      localsConvention: "camelCase"
    },
    devSourcemap: true,
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
        postcssPresetEnv({
          stage: 0,
          features: {
            "nesting-rules": true
          }
        })
      ]
    }
  },
  publicDir: "public",
  clearScreen: false,
  logLevel: "info"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdG9tYnV4ZGFvL0JVWERBTzMuMFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3RvbWJ1eGRhby9CVVhEQU8zLjAvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3RvbWJ1eGRhby9CVVhEQU8zLjAvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICd0YWlsd2luZGNzcydcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSAnYXV0b3ByZWZpeGVyJ1xuaW1wb3J0IHBvc3Rjc3NQcmVzZXRFbnYgZnJvbSAncG9zdGNzcy1wcmVzZXQtZW52J1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KHtcbiAgICAgIC8vIEV4cGxpY2l0bHkgY29uZmlndXJlIEZhc3QgUmVmcmVzaFxuICAgICAgZmFzdFJlZnJlc2g6IHRydWUsXG4gICAgfSlcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBfb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHByb3h5Lm9uKCdlcnJvcicsIChlcnIsIF9yZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm94eSBlcnJvcicsIGVycik7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVxJywgKHByb3h5UmVxLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3Q6JywgcmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVxdWVzdCBDb29raWVzOicsIHJlcS5oZWFkZXJzLmNvb2tpZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWNlaXZlZCBSZXNwb25zZTonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXNwb25zZSBDb29raWVzOicsIHByb3h5UmVzLmhlYWRlcnNbJ3NldC1jb29raWUnXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHdhdGNoOiB7XG4gICAgICB1c2VQb2xsaW5nOiB0cnVlXG4gICAgfSxcbiAgICBobXI6IHtcbiAgICAgIHByb3RvY29sOiAnd3MnLFxuICAgICAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gICAgICBwb3J0OiA1MTczXG4gICAgfVxuICB9LFxuICBidWlsZDoge1xuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHVuZGVmaW5lZCxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgcmVzb2x2ZToge1xuICAgIGV4dGVuc2lvbnM6IFsnLmpzJywgJy5qc3gnLCAnLnRzJywgJy50c3gnXSxcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiAnL3NyYycsXG4gICAgICAnYnVmZmVyJzogJ2J1ZmZlci8nLFxuICAgICAgJ0Bzb2xhbmEvd2FsbGV0LWFkYXB0ZXItcmVhY3QtdWkvc3R5bGVzLmNzcyc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMvQHNvbGFuYS93YWxsZXQtYWRhcHRlci1yZWFjdC11aS9zdHlsZXMuY3NzJylcbiAgICB9LFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAnQHNvbGFuYS93YWxsZXQtYWRhcHRlci1yZWFjdCcsXG4gICAgICAnQHNvbGFuYS93YWxsZXQtYWRhcHRlci1yZWFjdC11aScsXG4gICAgICAnQHNvbGFuYS93YWxsZXQtYWRhcHRlci1iYXNlJyxcbiAgICAgICdAc29sYW5hL3dhbGxldC1hZGFwdGVyLXdhbGxldHMnLFxuICAgICAgJ0Bzb2xhbmEvd2ViMy5qcycsXG4gICAgICAnYnVmZmVyJ1xuICAgIF0sXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgIHRhcmdldDogJ2VzbmV4dCdcbiAgICB9XG4gIH0sXG4gIGRlZmluZToge1xuICAgICdwcm9jZXNzLmVudic6IHt9LFxuICAgICdnbG9iYWwnOiB7fSxcbiAgfSxcbiAgY3NzOiB7XG4gICAgbW9kdWxlczoge1xuICAgICAgbG9jYWxzQ29udmVudGlvbjogJ2NhbWVsQ2FzZSdcbiAgICB9LFxuICAgIGRldlNvdXJjZW1hcDogdHJ1ZSxcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgIHRhaWx3aW5kY3NzLFxuICAgICAgICBhdXRvcHJlZml4ZXIsXG4gICAgICAgIHBvc3Rjc3NQcmVzZXRFbnYoe1xuICAgICAgICAgIHN0YWdlOiAwLFxuICAgICAgICAgIGZlYXR1cmVzOiB7XG4gICAgICAgICAgICAnbmVzdGluZy1ydWxlcyc6IHRydWUsXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgXVxuICAgIH1cbiAgfSxcbiAgcHVibGljRGlyOiAncHVibGljJyxcbiAgY2xlYXJTY3JlZW46IGZhbHNlLFxuICBsb2dMZXZlbDogJ2luZm8nXG59KSAiXSwKICAibWFwcGluZ3MiOiAiO0FBQWdRLFNBQVMsb0JBQW9CO0FBQzdSLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxrQkFBa0I7QUFDekIsT0FBTyxzQkFBc0I7QUFMN0IsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBO0FBQUEsTUFFSixhQUFhO0FBQUEsSUFDZixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLFFBQ0osV0FBVyxDQUFDLE9BQU8sYUFBYTtBQUM5QixnQkFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLE1BQU0sU0FBUztBQUNyQyxvQkFBUSxJQUFJLGVBQWUsR0FBRztBQUFBLFVBQ2hDLENBQUM7QUFDRCxnQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUM1QyxvQkFBUSxJQUFJLG9CQUFvQixJQUFJLFFBQVEsSUFBSSxHQUFHO0FBQ25ELG9CQUFRLElBQUksb0JBQW9CLElBQUksUUFBUSxNQUFNO0FBQUEsVUFDcEQsQ0FBQztBQUNELGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxTQUFTO0FBQzVDLG9CQUFRLElBQUksc0JBQXNCLFNBQVMsWUFBWSxJQUFJLEdBQUc7QUFDOUQsb0JBQVEsSUFBSSxxQkFBcUIsU0FBUyxRQUFRLFlBQVksQ0FBQztBQUFBLFVBQ2pFLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFlBQVk7QUFBQSxJQUNkO0FBQUEsSUFDQSxLQUFLO0FBQUEsTUFDSCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsSUFDUjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxZQUFZLENBQUMsT0FBTyxRQUFRLE9BQU8sTUFBTTtBQUFBLElBQ3pDLE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxNQUNMLFVBQVU7QUFBQSxNQUNWLDhDQUE4QyxLQUFLLFFBQVEsa0NBQVcseURBQXlEO0FBQUEsSUFDakk7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxnQkFBZ0I7QUFBQSxNQUNkLFFBQVE7QUFBQSxJQUNWO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZUFBZSxDQUFDO0FBQUEsSUFDaEIsVUFBVSxDQUFDO0FBQUEsRUFDYjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gsU0FBUztBQUFBLE1BQ1Asa0JBQWtCO0FBQUEsSUFDcEI7QUFBQSxJQUNBLGNBQWM7QUFBQSxJQUNkLFNBQVM7QUFBQSxNQUNQLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0EsaUJBQWlCO0FBQUEsVUFDZixPQUFPO0FBQUEsVUFDUCxVQUFVO0FBQUEsWUFDUixpQkFBaUI7QUFBQSxVQUNuQjtBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsV0FBVztBQUFBLEVBQ1gsYUFBYTtBQUFBLEVBQ2IsVUFBVTtBQUNaLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
