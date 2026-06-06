<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>

<!-- #ifdef H5 -->
<style>
/* ==========================================
   H5 全局响应式布局
   手机 <768px | 平板 768-1024px | 桌面 >1024px
   ========================================== */

/* 重置基础 */
*, *::before, *::after { box-sizing: border-box; }
html { font-size: 16px; -webkit-text-size-adjust: 100%; }
body { margin: 0; padding: 0; background: #f5f3ec; }

/* uni-app H5 根容器：限制最大宽度，居中显示 */
#app {
  min-height: 100vh;
  width: 100%;
}

/* 页面容器统一限宽居中 */
.uni-page-body,
uni-page-body,
.page {
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh;
}

/* 桌面端：添加卡片阴影效果，让页面像手机预览 */
@media (min-width: 600px) {
  body {
    background: #e8e0d0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  #app {
    max-width: 480px;
    width: 480px;
    min-height: 100vh;
    background: #f5f3ec;
    box-shadow: 0 0 40px rgba(0,0,0,0.18);
    position: relative;
  }

  .uni-page-body,
  uni-page-body {
    max-width: 100%;
    margin: 0;
  }
}

/* 平板和超宽屏：稍宽一点 */
@media (min-width: 900px) {
  #app {
    max-width: 500px;
    width: 500px;
  }
}

/* rpx 字体在大屏不要过大 */
@media (min-width: 600px) {
  html { font-size: 14px; }
}

/* 导航栏自适应 */
.uni-navbar__header {
  max-width: 480px;
  margin: 0 auto;
}

/* 图片默认 100% 宽不溢出 */
image, img {
  max-width: 100%;
  display: block;
}

/* ── 底部导航栏约束（与内容同宽居中）── */
@media (min-width: 600px) {
  /* 自定义 .tabbar（首页等页面内内嵌 tabbar） */
  .tabbar {
    max-width: 480px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
    border-top: 1px solid #eee !important;
    box-shadow: 0 -2px 12px rgba(0,0,0,0.06) !important;
  }
  /* uni-app 官方 tabbar（如果有） */
  .uni-tabbar {
    max-width: 480px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }
  /* 导航栏 */
  .uni-page-head {
    max-width: 480px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
  }
}

/* 滚动条美化 */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
</style>
<!-- #endif -->
