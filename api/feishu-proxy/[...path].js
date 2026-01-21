// Vercel Serverless Function: 飞书 API 代理
// 用于绕过浏览器 CORS 限制

export default async function handler(req, res) {
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
        // 从请求 URL 中获取目标路径
        const { path } = req.query;

        if (!path) {
            res.status(400).json({ error: '缺少 path 参数' });
            return;
        }

        const targetPath = Array.isArray(path) ? '/' + path.join('/') : '/' + path;
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
        res.status(500).json({ error: error.message });
    }
}
