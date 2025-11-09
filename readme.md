# 代理下载工具 (Cloudflare Pages + Functions)

## 功能
- 通过前端页面输入你要代理下载的 URL。
- 使用密码保护，防止他人滥用。
- 使用 Cloudflare 的 Cache API 缓存已下载的资源，加速后续访问。

## 快速部署
1. 在 GitHub 上创建一个仓库，并将本项目内容推送上去。
2. 在 Cloudflare → Pages → 新建项目 → 连接到该 GitHub 仓库。
3. 在 Pages 项目设置中添加环境变量：
   - 名称： `SECRET_KEY`
   - 值：你期望使用的密码（例如 `MySecret123`）
4. 部署项目。部署成功后访问你的 Pages 域名（如 `https://yourproject.pages.dev`）。
5. 在页面中输入目标 URL + 密码，即可点击下载。

## 注意事项
- 请确保你输入的目标 URL 是以 `http://` 或 `https://` 开头。
- 如果资源较大（数百 MB 或更多），可能会受到 Cloudflare 的执行时间或体积限制。
- 如果想强制文件下载而不是在浏览器中预览，可在 `functions/proxy.js` 中取消注释 `Content‑Disposition` 行。

## 授权
本工具仅供个人使用。若公开提供服务，请注意遵守目标站点的使用条款及下载行为规范。
