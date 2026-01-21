// Vercel Serverless Function: 飞书 API 代理
// Catch-all route handler for /api/feishu-proxy/*

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
        // 从查询参数中获取路径（Vercel catch-all 路由会将路径放在 query.path 中）
        const paths = req.query.path || [];
        const targetPath = Array.isArray(paths) ? '/' + paths.join('/') : '/' + paths;

        if (!targetPath || targetPath === '/') {
            res.status(400).json({ error: '缺少目标 API 路径', debug: { query: req.query, url: req.url } });
            return;
        }

        const targetUrl = `https://open.feishu.cn${targetPath}`;
        console.log(`[Vercel Proxy] ${req.method} -> ${targetUrl}`);
        console.log(`[Vercel Proxy] Query:`, req.query);

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
            query: req.query,
            url: req.url
        });
    }
};
