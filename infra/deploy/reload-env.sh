#!/usr/bin/env bash
# 改了 ~/.pig-secrets / .env.production 之后,**只要重新加载 env 不重部署**用这个
# 使用:
#   ssh pig 'bash -s' < infra/deploy/reload-env.sh
# 或在服务器上直接:
#   bash /opt/pig/current/infra/deploy/reload-env.sh
#
# 教训:
#   - pm2 reload (优雅重启) 不会重读环境变量,改 env 用它无效
#   - pm2 restart --update-env 才真正重读
#   - 部署脚本 backend.sh 用 pm2 start --update-env 不踩此坑;
#     但日常仅"改 env 不部署代码"场景需要本脚本

set -e
echo "═══ pm2 restart --update-env (强制重读 .env.production) ═══"
cd /opt/pig/current/backend
pm2 restart pig-backend --update-env
sleep 3
pm2 list --no-color | grep pig-backend
echo
echo "═══ 验证 ═══"
curl -s -m 5 http://127.0.0.1:3000/api/health | head -c 300
echo
