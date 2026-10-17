# Agent 指南

面向 Agent 初学者的独立阅读站，以及受邀伙伴使用的协作创作工作台。正式指南内容由站主和伙伴创作，仓库不预置教程观点。

## 本地开始

需要 Node.js 24。

```powershell
npm ci --ignore-scripts
npm run dev
```

打开 `http://127.0.0.1:5173/#/write`，使用明确标记的本地站主或伙伴演示入口。SQLite 与图片保存在 `.local/`，不上传 GitHub。演示发布只更新本机公开阅读页，不触发 GitHub 提交。生产 Worker 不提供此演示身份。

## 功能

- 桌面三栏：多级目录、BlockNote 富文本编辑器、本文大纲。
- 直接排版、粘贴和上传图片、插入表格、标题、列表与代码块。
- 草稿自动保存、同文档版本冲突保护、历史版本恢复、未保存内容副本导出。
- 保存与发布分离：私有共享草稿只供受邀成员访问，显式发布后才更新阅读站。
- 伙伴管理全部内容并发布普通文章；删除及批量目录调整提交站主审核。
- GitHub OAuth 登录、稳定 GitHub ID 邀请、成员停用与会话撤销、操作记录。
- GitHub Pages 发布公开阅读站；Cloudflare Workers + D1 承载创作工作台与私有图片。首版不启用 R2 订阅。

正式 GitHub OAuth、线上内容发布及伙伴共享使用，需要先完成独立后端配置。仅部署 GitHub Pages 不会启用私有工作台。

## 验证

```powershell
npm test
npm run check:dependencies
npm run build
npm audit
```

安全测试覆盖匿名访问边界、角色权限、Origin/CSRF、版本冲突、草稿与发布快照分离、图片隐私、过期审核、目录循环、会话撤销和不确定发布的恢复。依赖审计只说明审计时未发现已收录漏洞，不代表应用安全认证。

## 部署

详见 [部署步骤](docs/deployment.md) 和 [安全边界](docs/security.md)。先在此独立仓库启用 Settings → Pages → GitHub Actions。工作流构建 `dist/` 并部署，不需要旧网站的发布凭证。

阅读站使用相对资源路径和 hash 路由，可运行于 GitHub Pages 的项目子路径。未来可以给阅读站绑定自定义域名。创作入口通过 GitHub Repository Variable `WORKSPACE_URL` 指向独立 Worker。

## 开源基础

BlockNote 0.56.0 社区核心（MPL-2.0），React、Vite、Mantine、Lucide。未使用 BlockNote XL 或 Docmost 企业组件，未修改 BlockNote 源码。许可与研究记录见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [选型审查](docs/open-source-review.md)。本项目自身暂未指定开放源代码许可，公开仓库不等于自动授予再分发许可。
