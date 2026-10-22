# Sphinx 安全复查：2026-10-22

## 结论与修复

本次未发现网站私钥、GitHub OAuth Client secret 或发布 token 泄露的证据；未发现 PHP 运行环境。发现本机构建工具使用的 Node.js 24.18.1 早于本次安全修复，已为项目引入 24.22.1/26.12.1 安全下限，并固定 CI 到 24.22.1。使用从 Node.js 官网下载、与官方 SHA-256 核对一致的隔离版 24.22.1 完成验证，未更改系统安装或其他项目的运行时。

系统默认 Node.js 仍需由维护者更新。仅打开线上阅读站或工作台不会使用读者电脑的 Node.js。

## 对应的近期事件

- [PHP 官方 2026-10-21 公告](https://www.php.net/archive/2026.php)：CVE-2026-109618、CVE-2026-109619 可导致未认证远程代码执行。本项目是静态 React/Vite 前端与 Cloudflare Workers JavaScript 后端；未部署 PHP、PHP-FPM、mod_php 或相关 PHP 扩展，PHP 补丁不适用于本项目运行环境。
- [Mozilla 关于 eMudhra 的公告](https://blog.mozilla.org/security/2026/10/20/protecting-firefox-users-following-the-compromise-of-emudhra-intermediate-certificates/)和[原始事件记录](https://bugzilla.mozilla.org/show_bug.cgi?id=2083449)：8 个中间 CA 使用可被推算的弱私钥，涉及伪造证书及中间人风险。
- [Node.js 2026-10-21 安全公告](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)和[24.22.1 发布记录](https://nodejs.org/en/blog/release/v24.22.1)：包括 CA 信任库/被封锁公钥、TLS 验证、HTTP 等安全修复。`npm audit` 不检查 Node.js 运行时本身，因此另行增加运行时检查。

公开 HTTPS 证书包含公钥，是正常协议行为；可推算或泄露的私钥、被公开的应用凭据才是需要处理的问题。

## 检查证据

- 直接 TLS 连接阅读站与工作台，保持主机名与证书链验证开启，两者均通过。阅读站当前链为 `*.github.io → YR1 → Root YR → ISRG Root X1`；工作台当前链为 `zhege712-872.workers.dev → YE1 → Root YE → ISRG Root X2 → ISRG Root X1`。本次连接的链均不经过 eMudhra。GitHub 登录与发布所用的 `github.com`、`api.github.com` 当前链也未经过涉事 CA。
- 检查受 Git 管理的当前文本、所有本地可达引用的历史文本对象、构建产物及线上公开页面/JS/CSS/内容目录。扫描常见 GitHub、AWS、Google、npm token、命名服务端凭据、私钥头与 URL 内凭据，并检查环境文件和私钥容器文件名。命中的既有配置占位符和 URL 拒绝测试样例经复核后按“文件＋检测器＋精确摘要”豁免，没有整文件跳过测试或示例。
- 两个站点测试 `.env`、`.env.production`、`.dev.vars`、`.git/config`、`wrangler.jsonc`、服务端源码、配置助手、`package.json` 和常见 PHP 路径，没有读出配置或源码文件。Pages 返回 404；Worker 部分路径返回 SPA 首页，已按正文确认不是敏感文件。检查 JS 对应的 source map 路径，没有获取 source map 文件。
- 无 cookie 的线上请求：文档、私有图片、作者、成员和审计接口均返回 401，并使用 `no-store`；会话接口未认证、不返回 CSRF 或发布配置；本地演示登录在生产返回 404 且未签发 cookie；没有向测试外站来源开放 CORS。
- 审阅 OAuth 与发布边界：凭据仅在 Worker 服务端使用；OAuth 登录后根据稳定 GitHub ID 判定站主或有效受邀成员；会话随机值只保存哈希；生产 cookie 使用 HttpOnly/Secure；写入需要 Origin 与 CSRF。配置助手只绑定本机地址，不将凭据写入 Git 或反射到响应。
- 本次 npm 注册表审计报告 0 项已知依赖漏洞；依赖锁定与完整性检查通过。自动测试及生产构建通过。

## 新增的持续检查

- `.node-version`、`engines` 与 `scripts/check-runtime.mjs`：阻止修复前的运行时用于日常启动、构建和凭据配置；依赖检查也验证运行时。
- `npm run audit:secrets`：只输出文件、行号、检测类型和脱敏标记，覆盖当前 Git 文件、可达历史及 `dist`。二进制媒体不做文本扫描，大文件或异常文件会明确报告跳过并令命令失败。
- Pages CI 拉取完整可达历史，并在上传 `dist` 前运行凭据扫描；发现未豁免命中时阻止部署。
- `.gitignore` 排除常见私钥与私钥容器，作为额外防误提交措施。真实凭据继续使用 Worker Secrets。
- 维护者要求排除的 `myphotos/` 始终不打开、不扫描、不提交；用户其他未跟踪研究文件也不纳入发布。

## 证据边界

本次是代码、可达 Git 历史、依赖公告与当前公开部署检查，不能证明历史上从未遭受中间人攻击或凭据窃取；没有审计 Cloudflare/GitHub 内部、完整账号访问日志、已删除且不可达的 Git 对象或本机所有软件。模式扫描不能识别所有未知格式、编码或媒体内的秘密，依赖审计也不等于供应链无恶意代码。

当前站点使用其他 CA，不等于旧客户端天然免疫伪造证书。维护者与读者仍应更新浏览器、系统证书库及联网工具，保持证书验证和吊销保护开启。没有泄露证据时，不把“更换本网站合法证书”视作修复客户端信任库的方法；本次未无故撤销或更换现有登录和发布凭据。
