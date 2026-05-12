<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  const farmerId = uni.getStorageSync('pig:farmer_id');
  if (!farmerId) {
    uni.reLaunch({ url: '/pages/login/index' });
  }
});

onShow(() => {});
</script>

<style>
page { background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; }
</style>
