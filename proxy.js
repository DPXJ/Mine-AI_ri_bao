const http = require('http');
const https = require('https');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 只代理飞书和代理地址相关的请求
    let targetHost = 'open.feishu.cn';
    let targetPath = req.url;

    console.log(`[代理] 收到请求: ${req.method} ${targetPath}`);

    const options = {
        hostname: targetHost,
        path: targetPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetHost, // 必须修改 host 头
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
        console.error(`[错误] 转发请求失败: ${e.message}`);
        res.writeHead(500);
        res.end('Proxy Error');
    });

    req.pipe(proxyReq);
});

server.listen(PORT, () => {
    console.log(`==========================================`);
    console.log(`飞书同步代理服务已在端口 ${PORT} 启动`);
    console.log(`它将默默在后台为您解决跨域问题，请勿关闭本窗口`);
    console.log(`==========================================`);
});
