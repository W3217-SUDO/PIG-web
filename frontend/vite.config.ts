import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5173,
    host: '0.0.0.0',    // 允许局域网访问
    strictPort: false,
    cors: true,
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
    proxy: {
      // H5 开发时代理 API，避免跨域
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
