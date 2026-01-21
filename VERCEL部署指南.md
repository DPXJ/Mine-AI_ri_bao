# Vercel 部署指南

## 📋 前置要求

- GitHub 账号
- Vercel 账号（可使用 GitHub 登录）
- 项目代码已上传到 GitHub 仓库

## 🚀 部署步骤

### 方法一：通过 Vercel Dashboard（推荐）

1. **登录 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New Project"
   - 选择 "Import Git Repository"
   - 找到你的项目仓库并点击 "Import"

3. **配置项目**
   - **Project Name**: 可以自定义，例如 `daily-report-helper`
   - **Framework Preset**: 选择 "Other"（因为是静态 HTML 项目）
   - **Root Directory**: `.`（默认）
   - **Build Command**: 留空（静态项目不需要构建）
   - **Output Directory**: 留空
   - **Install Command**: 留空

4. **环境变量配置（可选）**
   - 如果使用飞书同步功能，需要添加环境变量：
     - `FEISHU_APP_ID`: 你的飞书应用 ID
     - `FEISHU_APP_SECRET`: 你的飞书应用密钥

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待部署完成（通常 1-2 分钟）
   - 部署成功后会得到一个类似 `https://your-project.vercel.app` 的链接

### 方法二：通过 Vercel CLI

1. **安装 Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**

   ```bash
   vercel login
   ```

3. **部署项目**

   ```bash
   cd d:\Lan_Company\01-AI-code-all\0001-test01
   vercel
   ```

4. **按提示操作**
   - Set up and deploy? **Y**
   - Which scope? 选择你的账号
   - Link to existing project? **N**
   - What's your project's name? 输入项目名称
   - In which directory is your code located? **.**
   - Want to override the settings? **N**

5. **生产部署**

   ```bash
   vercel --prod
   ```

## ⚙️ 项目配置文件说明

### vercel.json

你的项目已经包含了 `vercel.json` 配置文件，内容如下：

```json
{
  "rewrites": [
    {
      "source": "/api/feishu-proxy/:path*",
      "destination": "/api/feishu-proxy/:path*"
    }
  ]
}
```

这个配置用于处理飞书同步 API 的路由重写。

## 🔄 自动部署

配置完成后，每次你向 GitHub 仓库推送代码时，Vercel 会自动触发部署：

1. **主分支自动部署**
   - 推送到 `main` 或 `master` 分支会自动部署到生产环境

2. **预览部署**
   - 推送到其他分支或 Pull Request 会创建预览部署
   - 每个预览都有独立的 URL

## 📝 配置智谱 API

部署后，首次访问应用时需要配置 API：

1. 访问你的 Vercel 部署地址
2. 点击右上角的"设置"按钮
3. 输入智谱 AI 的 API Key
4. 点击保存

API Key 会保存在浏览器本地存储中，不会上传到服务器。

## 🛠️ 常见问题

### 1. 部署后无法访问？

- 检查 Vercel 部署状态是否成功
- 查看 Vercel Dashboard 中的部署日志
- 确认项目根目录包含 `index.html`

### 2. 飞书同步功能不可用？

- 确保已在 Vercel 项目设置中添加环境变量
- 检查 `api/feishu-proxy/[...path].js` 文件是否存在
- 查看浏览器控制台是否有错误信息

### 3. 如何更新域名？

- 在 Vercel Dashboard 进入项目设置
- 点击 "Domains" 标签
- 添加自定义域名并按提示配置 DNS

### 4. 如何查看部署日志？

- 登录 Vercel Dashboard
- 选择你的项目
- 点击具体的部署记录
- 查看 "Build Logs" 和 "Function Logs"

## 🎯 性能优化建议

1. **启用缓存**
   - Vercel 自动为静态资源启用 CDN 缓存

2. **图片优化**
   - 如果项目中有图片，考虑使用 WebP 格式
   - 使用 Vercel Image Optimization（需要升级计划）

3. **代码压缩**
   - CSS 和 JS 文件会自动压缩

## 📚 相关链接

- [Vercel 官方文档](https://vercel.com/docs)
- [智谱 AI 开放平台](https://open.bigmodel.cn/)
- [飞书开放平台](https://open.feishu.cn/)

---

**部署愉快！** 🎉

如有问题，请查看 Vercel Dashboard 中的部署日志或访问 Vercel 官方文档。
