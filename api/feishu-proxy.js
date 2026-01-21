// Vercel Serverless Function: 飞书 API 代理
// 处理所有被重写到这里的请求

module.exports = async function handler(req, res) {
    // CORS 头部
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    try {
        // 从 URL 中提取路径
        // 例如: /api/feishu-proxy/open-apis/auth/v3/tenant_access_token/internal
        // 提取: /open-apis/auth/v3/tenant_access_token/internal
        const fullUrl = req.url || '';
        const prefix = '/api/feishu-proxy';

        let targetPath = fullUrl;
        if (fullUrl.startsWith(prefix)) {
            targetPath = fullUrl.substring(prefix.length);
        }

        // 移除查询参数
        const queryIndex = targetPath.indexOf('?');
        if (queryIndex !== -1) {
            targetPath = targetPath.substring(0, queryIndex);
        }

        if (!targetPath || targetPath === '/') {
            res.status(400).json({
                error: '缺少目标 API 路径',
                debug: {
                    url: req.url,
                    fullUrl: fullUrl,
                    prefix: prefix
                }
            });
            return;
        }

        const targetUrl = `https://open.feishu.cn${targetPath}`;
        console.log(`[Vercel Proxy] ${req.method} -> ${targetUrl}`);

        // 构建转发请求的选项
        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // 转发 Authorization 头
        if (req.headers.authorization) {
            fetchOptions.headers['Authorization'] = req.headers.authorization;
        }

        // 对于 POST/PUT 请求，转发请求体
        if (req.method === 'POST' || req.method === 'PUT') {
            fetchOptions.body = JSON.stringify(req.body);
        }

        // 发送请求到飞书 API
        const response = await fetch(targetUrl, fetchOptions);
        const data = await response.json();

        console.log(`[Vercel Proxy] Response: ${response.status}`);

        res.status(response.status).json(data);

    } catch (error) {
        console.error('[Vercel Proxy] Error:', error.message);
        res.status(500).json({
            error: error.message,
            stack: error.stack,
            url: req.url
        });
    }
};
