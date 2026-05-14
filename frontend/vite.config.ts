import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    port: 5173,
    strictPort: false,  // 如果 5173 被占用自动换端口
    cors: true,         // 允许 file:// 原型页跨域访问
    headers: {
      'X-Frame-Options': 'ALLOWALL',  // 允许 iframe 嵌入
    },
  },
});
