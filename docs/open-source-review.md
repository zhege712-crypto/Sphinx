# 开源基础选型记录

核查日期：2026-10-16（北京时间）。当前完成范围为官方仓库、许可、发布记录、已公开安全公告和所选依赖锁文件检查；不代表完整渗透测试或对未来漏洞的保证。

## 结论

首版采用 **BlockNote 社区核心作为编辑器**，用独立项目实现阅读页、目录、邀请制 GitHub 登录、草稿、发布与审核。BlockNote 是编辑组件，不是一套已经具备上述权限规则的成品后台。

选择理由：已有较完整的编辑 UI，支持块编辑、图片上传回调、剪贴板粘贴、表格和菜单；可把主要开发工作用于本站权限与发布流程。使用社区核心，不引入 XL 模块。直接依赖锁定版本，传递依赖由 package-lock.json 固定。

## 对比

| 项目 | 已核查的适用性 | 许可与部署边界 | 结论 |
| --- | --- | --- | --- |
| [BlockNote](https://github.com/TypeCellOS/BlockNote) | React 富文本编辑器，现成图片、表格、块菜单及 UI；核查到稳定版 v0.56.0 | 核心 MPL-2.0；XL 为 GPL-3.0 或商业许可；编辑器可打包成静态前端，业务后端另行实现 | 首选组件 |
| [Tiptap](https://github.com/ueberdosis/tiptap) | 可定制的编辑内核，图片和表格扩展成熟；核查到稳定版 v3.32.0 | 开源编辑器 MIT；完整工具栏、文件上传和业务界面需自行组装 | 深度定制时的备选，也是 BlockNote 的底层依赖 |
| [Docmost](https://github.com/docmost/docmost) | 已有较完整的知识库、目录和协作体验；核查到稳定版 v0.96.0 | 社区核心 AGPL-3.0，企业目录另有许可；官方 Docker Compose 需要 PostgreSQL、Redis 和应用服务 | 更适合独立服务器部署，不作为当前 Workers 路线的基础 |

不能用星标数或安全公告数量判断项目是否安全。主动披露并修复漏洞是正面维护信号；没有公开公告也不能证明不存在漏洞。

## 安全核查

BlockNote 依赖 Tiptap，因此一并检查其安全公告，而不是只检查 BlockNote 仓库。

- [GHSA-cp6q-959q-f8rh](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-cp6q-959q-f8rh)：`@tiptap/core` 属性合并问题，公告修复版本 3.30.4。
- [GHSA-j95f-988m-3j2f](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-j95f-988m-3j2f)：`@tiptap/core` Markdown 解析拒绝服务问题，公告修复版本 3.30.5。
- [GHSA-pmh9-4rj3-c67g](https://github.com/ueberdosis/tiptap/security/advisories/GHSA-pmh9-4rj3-c67g)：协作光标颜色注入问题，公告修复版本 3.31.3；首版不启用实时协作。
- Docmost 的[公告页](https://github.com/docmost/docmost/security/advisories)和[v0.96.0 发布说明](https://github.com/docmost/docmost/releases/tag/v0.96.0)公开了历史问题与安全修复；不将这些历史公告误记为最新版仍未修复的漏洞。

已生成所选项目的依赖锁文件，随后 `npm audit --json` 报告依赖总计 113 个、已知漏洞 0 个；锁定的 `@tiptap/core` 为 3.32.0。该结果只说明当时 registry 审计数据库未报告锁文件依赖存在已知漏洞，不覆盖应用权限、上传、草稿泄露或未来漏洞。

`npm run check:dependencies` 进一步检查直接版本锁定、下载来源、完整性字段、XL 许可边界以及上述 Tiptap 安全版本基线；它不是 npm audit 的替代品。

## 业务安全要求

- GitHub 身份验证、站内邀请、内容编辑权限、仓库写入权限分别处理。
- 伙伴可发布普通文章；删除和批量操作必须由服务端确认站主批准。
- 草稿、未公开图片和成员数据不写入公开仓库或静态索引。
- 后端写入凭证不交给浏览器，不借用旧网站的生产密钥。
- 图片上传仍需鉴别实际文件格式、限制大小和隔离未发布资源，不能把编辑器的上传回调当作完整安全方案。
- 网站代码、Worker、数据库、登录应用均独立；同一 Cloudflare 账号的共享额度仍需在部署前核查。

## 官方来源

- [BlockNote 许可证](https://github.com/TypeCellOS/BlockNote/blob/v0.56.0/LICENSE.txt)
- [BlockNote v0.56.0](https://github.com/TypeCellOS/BlockNote/releases/tag/v0.56.0)
- [BlockNote 许可与功能边界](https://www.blocknotejs.org/pricing)
- [BlockNote 上传接口](https://www.blocknotejs.org/examples/backend/file-uploading)
- [Tiptap 安全政策](https://github.com/ueberdosis/tiptap/blob/main/SECURITY.md)
- [Tiptap v3.32.0](https://github.com/ueberdosis/tiptap/releases/tag/v3.32.0)
- [Docmost 许可与版本](https://docmost.com/docs/editions)
- [Docmost 官方部署依赖](https://github.com/docmost/docmost/blob/main/docker-compose.yml)

## 当前构建状态

已选择编辑器基础、初始化 package.json、生成 package-lock.json、加入依赖检查脚本。尚未实现可运行网页，尚未连接 GitHub OAuth 或数据库，也没有改动任何旧站或创建线上资源。
