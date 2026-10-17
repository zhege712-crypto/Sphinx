# 独立部署

本项目与已有的 `Poem_Ulysses` 和个人主页仓库分别部署。不要复用旧站 OAuth 密钥、D1 数据库、R2 桶或生产发布 token。Cloudflare 同一账号的套餐、存储和请求配额可能共享；尚未核查实际账户余量。

## 1. GitHub Pages 阅读站

仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。推送 main 后，`.github/workflows/pages.yml` 自动测试、构建并部署。只发布 `public/catalog.json` 中明确公开的快照及 `public/assets/`；数据库、私有草稿和 `.local/` 不参与构建。

初始公开目录为空，这是预期状态。不要为填充首页把私有草稿写进 public。项目 URL 为 `https://zhege712-crypto.github.io/Sphinx/`，实际可用状态以 Pages 成功部署为准。

## 2. Cloudflare 创作工作台

首版使用 Cloudflare Workers 与 D1。按站主选择，图片也保存在独立 D1 中，不开通 R2 订阅。在当前项目目录使用已固定版本的 Wrangler CLI（`npx wrangler`）登录 Cloudflare，然后创建全新资源：

```powershell
npx wrangler d1 create howtoagent-content
```

将新 D1 ID 填入 `wrangler.jsonc`。私有图片分块写入 `file_objects` / `file_chunks`，每块 256 KiB，单张仍限 5 MiB，首版图片预算 256 MiB。图片只通过带授权校验的 API 返回，不进入公开仓库，直到明确发布。

当前项目已创建独立数据库 `howtoagent-content`。执行下面的幂等建表语句不会修改旧站数据库。

```powershell
npx wrangler d1 execute howtoagent-content --remote --file=server/schema.sql
```

更新 `wrangler.jsonc` 的 `APP_ORIGIN` 为实际 Worker 的 HTTPS origin（不带路径或末尾斜杠），`OWNER_GITHUB_ID` 为站主的稳定数字 GitHub ID。用户改名后仍靠 ID 判断权限。仓库必须是此独立仓库 `zhege712-crypto/Sphinx`，发布分支 main。

## 3. 独立 GitHub OAuth App

在 GitHub Developer settings 新建 OAuth App，Homepage URL 为工作台 URL，Authorization callback URL 为 `https://实际工作台地址/auth/callback`。它只申请 `read:user`，不依赖伙伴授予仓库写权限。

推荐运行 `npm run configure:workspace`，打开 `http://127.0.0.1:8977`，亲自填入 Client ID 和 Client secret。它仅监听本机，校验来源与一次性运行 nonce，经官方 Wrangler 的标准输入写入本项目 Worker Secrets；关闭 Wrangler 磁盘日志，不生成密钥文件，也不会向页面反射密钥。页面运行一小时后失效。不要把密钥发到聊天、提交到仓库或截图。也可以直接使用官方命令：

```powershell
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

创建细粒度 GitHub token，只允许此仓库的 Contents 读写，用作服务端发布。token 不需要 Members/Administration 权限，也不应拥有其他仓库权限。使用支持触发 Actions 的凭证，普通 Pages 构建才能随内容发布运行。

```powershell
npx wrangler secret put GITHUB_PUBLISH_TOKEN
npm run build
npx wrangler deploy
```

部署前检查配置没有 `LOCAL_DEMO`。该布尔值只在 localhost 适配器硬编码，正式 Worker 环境变量不应配置同名值。

## 4. 接上伙伴入口

在 GitHub Repository Settings → Secrets and variables → Actions → Variables 添加 `WORKSPACE_URL`，值为 `https://实际工作台地址/#/write`，然后重新运行 Pages workflow。它是公开 URL，无需作为 secret。

用户在 Worker 同源页面登录与编辑，避免 GitHub Pages 和 workers.dev 跨站 cookie 限制。站主先用自己的 GitHub 登录，在“协作成员”中输入伙伴用户名，后台查询并记录稳定 ID。伙伴再通过相同入口登录。

当前源码已内置正式工作台地址作为默认入口；设置 `WORKSPACE_URL` 可在未来覆盖它，首次部署不必额外配置该变量。

静态阅读页读取目录时使用 `cache: 'no-store'`，刷新或重新进入阅读路由时重新获取目录，避免浏览器继续使用旧的文章列表。GitHub Pages/CDN 与已打开页面的缓存仍不能视为撤回已传播内容的机制。

## 5. 上线验收

1. 匿名窗口只能读到已发布快照，无法打开草稿 API 或私有图片。
2. 受邀伙伴能保存、上传、发布，不能管理成员或批准审核。
3. 站主可处理删除和批量移动；申请后文档发生变化时拒绝过期批准。
4. 发布后确认 GitHub commit 和 Pages Actions 运行成功，阅读 URL 显示新版本。
5. 测试停用伙伴会撤销已有会话；检查 D1 备份、图片预算及 Cloudflare 配额告警。

后续确需扩容时可以把 `FILES` 接口接入私有 R2，需站主另行决定开通；当前没有创建桶或订阅。

后续购买域名后，在 Pages 配置自定义域名并按 GitHub 提供的 DNS 指引设置。创作工作台也可绑定独立子域名，届时同步更新 APP_ORIGIN 和 OAuth callback。国内访问速度以具体网络实测为准。

## 2026-10-17 上线记录

Reference 升级为独立可编辑词条（数据库 `documents.kind='reference'`），复用已有字段，不需要改表或搬迁旧稿。先部署新 Worker，再在站主的词条索引点击“迁移原有词条”。接口 `/api/references/initialize` 仅站主可调用，使用固定 ID 且不会覆盖既有词条；只发布仍与原公开模板完全一致、版本为 1 的未编辑初稿。迁移和词条发布仍走同一 GitHub 原子提交与恢复流程。已编辑或归档的词条不会被重置。

工作台为 `https://howtoagent-workspace.zhege712-872.workers.dev`，阅读站为 `https://zhege712-crypto.github.io/Sphinx/`。用户亲自配置 OAuth 和单仓库发布凭证；后端已确认两者生效。已实际验证站主 GitHub 登录、共享草稿刷新恢复、5 MiB D1 图片上传与解码、发布前匿名拒绝，以及从工作台发布到 GitHub Pages 的完整链路。测试稿经站主批准删除，正式目录保持为空，留给作者开始创作。发布凭证于 2026-11-16 到期，届时需续换。伙伴权限边界已有自动测试，尚未用第二个真人账号验收。
