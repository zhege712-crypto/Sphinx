# Sphinx

面向 Agent 初学者的独立阅读站，以及受邀伙伴使用的协作创作工作台。正式指南内容由站主和伙伴创作，仓库不预置教程观点。

## 本地开始

需要 Node.js 24.22.1 或更新的 24.x 安全版本（也支持 26.12.1 或更新的 26.x）。CI 使用 `.node-version` 固定版本；启动、构建和凭据配置前会检查安全下限。

```powershell
npm ci --ignore-scripts
npm run dev
```

打开 `http://127.0.0.1:5173/#/write`，使用明确标记的本地站主或伙伴演示入口。SQLite 与图片保存在 `.local/`，不上传 GitHub。演示发布只更新本机公开阅读页，不触发 GitHub 提交。生产 Worker 不提供此演示身份。

## 功能

- 桌面三栏：多级目录、BlockNote 富文本编辑器、本文大纲。
- 直接排版、粘贴和上传图片、插入表格、标题、列表与代码块。所有编辑页都有带文字的「链接卡片」入口。
- 图片尺寸有滑杆、像素值和小/中/满宽预设，支持靠左/居中/靠右，以及图左文右、文左图右的多段富文本排版；退出并排会将文字保留为普通正文。
- 每篇文章、目录说明和词条的阅读页显示已发布版本的最近更新时间，未发布草稿不会影响该时间。
- Reference 是可编辑的词条字典：A–Z/中文“其他”分组、搜索和紧凑名称索引；每个词条有独立正文与资料卡片，可新增、改名、插图、保存草稿与发布。原有 12 项资料迁为初始词条，词条内容由创作者维护。
- 草稿自动保存、同文档版本冲突保护、历史版本恢复、未保存内容副本导出。
- 保存与发布分离：私有共享草稿只供受邀成员访问，显式发布后才更新阅读站。
- 站主可在文档操作或全部文档中隐藏/恢复读者显示；后台正文、草稿与历史保留。隐藏目录连带隐藏后代，恢复不发布修订草稿，单独隐藏的子文档继续隐藏。公开站在构建后更新，已发布历史文件与缓存不由此清除。
- 伙伴管理全部内容并发布普通文章；删除及批量目录调整提交站主审核。
- GitHub OAuth 登录、稳定 GitHub ID 邀请、成员停用与会话撤销、操作记录。
- GitHub Pages 发布公开阅读站；Cloudflare Workers + D1 承载创作工作台与私有图片。首版不启用 R2 订阅。

正式 GitHub OAuth、线上内容发布及伙伴共享使用，需要先完成独立后端配置。仅部署 GitHub Pages 不会启用私有工作台。

## 验证

```powershell
npm test
npm run check:dependencies
npm run build
npm run audit:secrets
npm audit
```

安全测试覆盖匿名访问边界、角色权限、Origin/CSRF、版本冲突、草稿与发布快照分离、图片隐私、过期审核、目录循环、会话撤销和不确定发布的恢复。依赖审计只说明审计时未发现已收录漏洞，不代表应用安全认证。

## 部署

详见 [部署步骤](docs/deployment.md) 和 [安全边界](docs/security.md)。先在此独立仓库启用 Settings → Pages → GitHub Actions。工作流构建 `dist/` 并部署，不需要旧网站的发布凭证。

阅读站使用相对资源路径和 hash 路由，可运行于 GitHub Pages 的项目子路径。未来可以给阅读站绑定自定义域名。创作入口通过 GitHub Repository Variable `WORKSPACE_URL` 指向独立 Worker。

词条索引为 `#/reference`，独立阅读页为 `#/reference/<id>`。工作台的 `#/write/reference` 管理全部词条，`#/write/reference/<id>` 直接编辑指定词条。首次升级由站主在空索引点击“迁移原有词条”；迁移只转换旧版已公开的固定资料，不覆盖用户的编辑或归档记录。

## 开源基础

BlockNote 0.56.0 社区核心（MPL-2.0），React、Vite、Mantine、Lucide。未使用 BlockNote XL 或 Docmost 企业组件，未修改 BlockNote 源码。许可与研究记录见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 [选型审查](docs/open-source-review.md)。本项目自身暂未指定开放源代码许可，公开仓库不等于自动授予再分发许可。

项目已更名为 Sphinx，仓库与阅读页使用新名称。现有 Worker `howtoagent-workspace` 和 D1 `howtoagent-content` 保留内部资源名，以沿用登录配置和既有数据；它们不决定产品展示名称。

词汇链接：在任意编辑页选中文字，点击工具栏「词汇链接」，搜索并选择站内 Reference 词条，或填写站外 http/https 网址。再次选中已有链接或将光标放入其中，可更换目标或移除链接；保留原词汇和文字样式。只处理作者选择的文字，不自动匹配其他同名词。站内在当前阅读页打开，站外另开标签页。未发布词条会标注提示，需发布后读者才能访问。
