import { createSSRApp } from 'vue';
import App from './App.vue';
import { initSentry } from './utils/sentry';

// 全局错误上报(条件 H5 + 有 DSN 才生效, 无开销)
initSentry();

export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}
