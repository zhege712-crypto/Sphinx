# 独立部署

本项目与已有的 `Poem_Ulysses` 和个人主页仓库分别部署。不要复用旧站 OAuth 密钥、D1 数据库、R2 桶或生产发布 token。Cloudflare 同一账号的套餐、存储和请求配额可能共享；尚未核查实际账户余量。

## 1. GitHub Pages 阅读站

仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。推送 main 后，`.github/workflows/pages.yml` 自动测试、构建并部署。只发布 `public/catalog.json` 中明确公开的快照及 `public/assets/`；数据库、私有草稿和 `.local/` 不参与构建。

初始公开目录为空，这是预期状态。不要为填充首页把私有草稿写进 public。项目 URL 为 `https://zhege712-crypto.github.io/howtoagent/`，实际可用状态以 Pages 成功部署为准。

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

更新 `wrangler.jsonc` 的 `APP_ORIGIN` 为实际 Worker 的 HTTPS origin（不带路径或末尾斜杠），`OWNER_GITHUB_ID` 为站主的稳定数字 GitHub ID。用户改名后仍靠 ID 判断权限。仓库必须是此独立仓库 `zhege712-crypto/howtoagent`，发布分支 main。

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

## 5. 上线验收

1. 匿名窗口只能读到已发布快照，无法打开草稿 API 或私有图片。
2. 受邀伙伴能保存、上传、发布，不能管理成员或批准审核。
3. 站主可处理删除和批量移动；申请后文档发生变化时拒绝过期批准。
4. 发布后确认 GitHub commit 和 Pages Actions 运行成功，阅读 URL 显示新版本。
5. 测试停用伙伴会撤销已有会话；检查 D1 备份、图片预算及 Cloudflare 配额告警。

后续确需扩容时可以把 `FILES` 接口接入私有 R2，需站主另行决定开通；当前没有创建桶或订阅。

后续购买域名后，在 Pages 配置自定义域名并按 GitHub 提供的 DNS 指引设置。创作工作台也可绑定独立子域名，届时同步更新 APP_ORIGIN 和 OAuth callback。国内访问速度以具体网络实测为准。
