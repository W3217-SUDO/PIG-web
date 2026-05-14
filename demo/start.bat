@echo off
chcp 65001 >nul
title 私人订猪 · 原型启动器

echo.
echo  ================================================
echo    私人订猪  完整原型预览  启动中...
echo  ================================================
echo.

:: 设置 Node.js 路径
set "PATH=D:\Kiro\node20;%PATH%"

:: 检查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请检查路径 D:\Kiro\node20
    pause
    exit /b 1
)

echo [1/3] 启动后端服务 (端口 3000)...
start "私人订猪-后端" cmd /k "title 私人订猪-后端 ^& cd /d D:\Kiro\pig\Kiropig\backend ^& echo 正在启动后端... ^& node dist\main.js"

echo [2/3] 启动 H5 开发服务器 (端口 5173)...
start "私人订猪-H5" cmd /k "title 私人订猪-H5开发服务器 ^& cd /d D:\Kiro\pig\Kiropig\frontend ^& echo 正在启动 H5 服务器... ^& node ..\node_modules\.bin\uni"

echo [3/3] 等待服务启动...
timeout /t 5 /nobreak >nul

echo.
echo  ================================================
echo    正在打开原型预览页...
echo  ================================================
echo.

:: 用默认浏览器打开原型页
start "" "%~dp0prototype.html"

echo.
echo  ✓ 启动完成！
echo  ✓ 原型预览: 已在浏览器中打开
echo  ✓ H5 服务器: http://localhost:5173
echo  ✓ 后端接口:  http://localhost:3000/api
echo.
echo  提示: 修改源文件后页面会自动热更新
echo  关闭本窗口不影响已启动的服务
echo.
pause
