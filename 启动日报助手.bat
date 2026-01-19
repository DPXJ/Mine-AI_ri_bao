@echo off
echo ==========================================
echo    工作日报润色助手 - 跨域修复终极工具
echo ==========================================
echo.
echo 正在尝试启动本地服务和代理服务以解决同步问题...
echo.

:: 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 您的电脑没安装 Node.js，无法使用自动启动功能。
    pause
    exit /b
)

:: 同时启动网页服务和代理服务
:: 使用 start 命令开启新窗口
echo [1/2] 正在后台启动【飞书同步代理】(3000端口)...
start "飞书同步代理服务" node proxy.js

echo [2/2] 正在启动【网页服务】(8080端口)...
echo.
echo 启动成功！请通过下面的链接访问：
echo.
echo 👉 链接 1 (推荐): http://127.0.0.1:8080
echo 👉 链接 2 : http://localhost:8080
echo.
echo 注意：
echo 1. 请保持黑色窗口运行，不要关闭。
echo 2. 同步数据时，代理窗口会显示请求记录。
echo.

npx http-server -p 8080
pause
