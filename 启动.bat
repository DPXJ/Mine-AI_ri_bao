@echo off
chcp 65001 >nul
echo ==========================================
echo          工作日报润色助手
echo ==========================================
echo.
echo 正在启动本地服务器...
echo.

:: 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Node.js，需要安装 Node.js 才能运行本地服务器。
    echo.
    echo 请前往 https://nodejs.org/ 下载安装 Node.js
    echo.
    pause
    exit /b
)

:: 启动本地网页服务
echo [启动中] 正在启动网页服务器（端口: 8080）...
echo.
echo ✅ 启动成功！请通过以下链接访问：
echo.
echo 👉 http://localhost:8080
echo 👉 http://127.0.0.1:8080
echo.
echo 💡 提示：
echo    - 按 Ctrl+C 可停止服务器
echo    - 请保持此窗口打开
echo    - 如需使用飞书同步功能，请先配置环境变量
echo.
echo ==========================================
echo.

:: 使用 npx http-server 启动静态服务器
npx http-server -p 8080 -c-1

pause
