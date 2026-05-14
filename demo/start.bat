@echo off
chcp 65001 >nul
title 私人订猪 · 原型启动器

echo.
echo  ================================================
echo    私人订猪  完整原型  启动中...
echo  ================================================
echo.

set "PATH=D:\Kiro\node20;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请检查 D:\Kiro\node20
    pause & exit /b 1
)

echo [1/4] 启动后端服务 (端口 3000)...
start "私人订猪-后端" cmd /k "title 私人订猪-后端 & set PATH=D:\Kiro\node20;%PATH% & cd /d D:\Kiro\pig\Kiropig\backend & node dist\main.js"

echo [2/4] 启动 H5 开发服务器 (端口 5173)...
start "私人订猪-H5" cmd /k "title 私人订猪-H5 & set PATH=D:\Kiro\node20;%PATH% & cd /d D:\Kiro\pig\Kiropig\frontend & node ..\node_modules\@dcloudio\vite-plugin-uni\bin\uni.js"

echo [3/4] 启动原型页服务器 (端口 8080)...
start "私人订猪-原型页" cmd /k "title 私人订猪-原型页 & set PATH=D:\Kiro\node20;%PATH% & cd /d D:\Kiro\pig\Kiropig\demo & node serve.js"

echo [4/4] 等待服务启动 (12秒)...
timeout /t 12 /nobreak >nul

echo  正在打开原型预览页...
start "" "http://localhost:8080"

echo.
echo  ✓ 全部启动完成
echo  ✓ H5 服务:  http://localhost:5173
echo  ✓ 后端接口: http://localhost:3000/api
echo  ✓ 原型页:   http://localhost:8080
echo.
echo  提示: 修改源文件后页面自动热更新 (Vite HMR)
echo  关闭本窗口不影响已启动的服务
echo.
pause
