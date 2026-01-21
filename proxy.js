const http = require('http');
const https = require('https');

const PORT = 3000;

// 解析请求体
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve(body);
            }
        });
        req.on('error', reject);
    });
}

// 发起 HTTPS 请求
function httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, headers: res.headers, data });
                }
            });
        });
        req.on('error', reject);
        if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    // CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 健康检查
    if (req.url === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', message: '代理服务运行中' }));
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

    try {
        // 解析请求路径，转发到飞书 API
        const targetPath = req.url;
        const body = await parseBody(req);

        // 构建转发请求
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: targetPath,
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // 转发 Authorization 头
        if (req.headers.authorization) {
            options.headers['Authorization'] = req.headers.authorization;
        }

        console.log(`  → 转发到: https://open.feishu.cn${targetPath}`);

        const result = await httpsRequest(options, Object.keys(body).length > 0 ? body : null);

        console.log(`  ← 响应状态: ${result.statusCode}`);

        res.writeHead(result.statusCode);
        res.end(JSON.stringify(result.data));

    } catch (error) {
        console.error('  ✗ 代理错误:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    飞书代理服务已启动                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  代理地址: http://localhost:${PORT}                          ║`);
    console.log('║  健康检查: http://localhost:3000/health                    ║');
    console.log('║                                                            ║');
    console.log('║  请保持此窗口打开，然后在浏览器中使用日报助手                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
});
