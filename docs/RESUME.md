# 继续工作记录（2026-10-17）

用户已恢复工作。采用独立 GitHub Pages 阅读站与 Cloudflare Worker 创作工作台，不启用 R2 计费订阅，不修改旧站资源。

- 仓库：https://github.com/zhege712-crypto/Sphinx
- 阅读站：https://zhege712-crypto.github.io/Sphinx/ （已有成功部署）
- 工作台：https://howtoagent-workspace.zhege712-872.workers.dev
- 独立 D1：howtoagent-content，已初始化全部表。图片分块存入 D1，256 KiB/块、5 MiB/张、总预算 256 MiB。
- Worker 已正式部署，匿名草稿请求返回 401，公开目录为空。生产不启用演示身份。
- 用户已注册独立 GitHub OAuth App。回调为工作台 /auth/callback，只申请 read:user，以数字 GitHub ID 判断成员。
- 本机安全配置入口：npm run configure:workspace → http://127.0.0.1:8977 。用户自己生成并粘贴密钥，标准输入交给官方 Wrangler，不生成密钥文件，关闭 Wrangler 磁盘日志。一小时后页面失效。
- OAuth 和仅限 Sphinx 的细粒度发布 token 均由用户亲自生成并通过本机页面写入 Cloudflare；线上 /api/session 两项配置标志均为 true。发布 token 的 30 天有效期到 2026-11-16，届时需续换。
- 已验证真实 GitHub 站主登录、正式 D1 5 MiB 图片上传及解码、刷新后草稿持久化。数据库确认 20 块共 5,242,880 字节，发布前匿名访问图片与草稿均返回 401。
- 已用纯测试稿跑通 GitHub 提交与 Pages 发布（Actions 39004909158），正式阅读站显示正文、图片及正确的伙伴入口。用户随后批准清理，删除审核已执行，公开目录恢复为空。测试图从当前公开文件移除，工作台原图恢复私有；Git 历史仍保留已公开的测试副本。
- 用户可直接开始创作，在“协作成员”按 GitHub 用户名邀请伙伴。没有替用户邀请其他账号；伙伴角色边界由本机安全测试验证，尚未用第二个真人账号登录验收。
- 用户进一步明确 Reference 必须是可编辑词条字典，优先显示词条名称，不是全卡片目录。已改为 `documents.kind='reference'`，`#/reference` 为紧凑 A–Z/其他索引，`#/reference/<id>` 为独立阅读页，`#/write/reference/<id>` 为完整富文本编辑页。网站卡片是正文 `linkCard` 块，可编辑名称/网址，任意新增、移除；索引没有网站卡片。首次由站主迁移旧 12 项公开资料为词条，不自动覆盖任何用户改稿。仍使用本地 MIT Lobe 品牌图标与 OpenAI/DeepSeek 构建署名。词条内容与模型链接后续由作者维护。
- UI 独立复查已 PASS；DESIGN.md 和 .impeccable/design.json 已完成；无需重跑 detector。
- 当前 25 项测试通过，新增词条编辑/发布/私有改稿/审核、迁移权限与幂等、网站卡片 URL 净化测试；生产构建通过。已知编辑器大分块警告仍在，按需加载编辑器。
- 本地演示 npm run dev，编辑入口 http://127.0.0.1:5173/#/write ，数据在忽略目录 .local/。

任何密钥均不应出现在仓库、聊天、截图或操作日志里。没有创建 R2 桶或订阅。

凭据配置服务在成功后关闭。需要换密钥时重新运行即可。

## Sphinx 升级（2026-10-17）

仓库正式改为 Sphinx，阅读页路径 /Sphinx/，界面只展示英文。Worker 与 D1 内部名保持不变，发布目标已改为 zhege712-crypto/Sphinx。新增每篇已发布快照的 updatedAt 元数据（旧快照回退 publishedAt）；所有编辑页均有带文字的插入工具；imageText 布局块保存左右图文、多段子块与图片比例，图片发布隐私检查与普通 image 共用。
