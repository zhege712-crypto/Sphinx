import { ArrowUpRight, Mail, PencilLine, TvMinimal, Star, MessageSquare, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { publicSiteUrl, repositoryUrl } from './site-config';
import { Reader } from './Reader';
import UpdatedAt from './UpdatedAt';
import { BuildCredits } from './Brands';
import './about.css';
import SiteNotice from './SiteNotice';

export default function About({ document, writing, hasDraft, onEdit, contributors, hasContributorsDraft, onEditContributors, busy }) {
  const support = useRef();
  const [shareStatus, setShareStatus] = useState('');
  const focusSupport = new URLSearchParams(location.hash.split('?')[1] || '').get('section') === 'support';
  useEffect(() => {
    if (!focusSupport) return;
    const frame = requestAnimationFrame(() => { support.current?.scrollIntoView({ block: 'start' }); support.current?.focus({ preventScroll: true }); });
    return () => cancelAnimationFrame(frame);
  }, [focusSupport]);
  return <article className="about-page document-column">
    <div className="document-paper public-paper">
      <h1 className="document-title">关于 Sphinx</h1>
      <section className="project-introduction" aria-labelledby="project-introduction-title">
        <div className="about-section-heading"><h2 id="project-introduction-title">项目介绍</h2>{onEdit && <button disabled={busy} onClick={onEdit}><PencilLine size={15} />{hasDraft ? '编辑项目介绍' : '撰写项目介绍'}</button>}</div>
        {writing && <p className="about-author-note">此处展示已发布的介绍。编辑后先保存草稿，点击发布再更新此页。</p>}
        {document ? <><UpdatedAt document={document} /><Reader blocks={document.blocks} /></> : <div className="project-introduction-empty"><p>{writing ? '这里留给你介绍 Sphinx 的初衷、内容与计划。' : '项目介绍即将补充。'}</p></div>}
      </section>
      <section className="contributors-section" aria-labelledby="contributors-title">
        <div className="about-section-heading"><h2 id="contributors-title">参与者与致谢</h2>{onEditContributors && <button disabled={busy} onClick={onEditContributors}><PencilLine size={15} />{hasContributorsDraft ? '编辑参与者名单' : '整理参与者名单'}</button>}</div>
        {writing && <div className="about-author-note"><p>{hasContributorsDraft ? '名单支持自由分组，填写昵称、贡献、个人链接和邮箱，无需 GitHub 账号。' : '首次打开会将现有写作成员带入草稿，并预留“其他贡献者”分组。'}</p><p>选中姓名或文字，点击“词汇链接 → 站外网址”，即可关联个人网站或其他主页；选择“邮箱”可关联邮箱地址。发布后展示于此；名单不授予工作台权限。</p></div>}
        {contributors ? <><UpdatedAt document={contributors} /><Reader blocks={contributors.blocks} /></> : <p className="contributors-empty">参与者名单正在整理中。</p>}
      </section>
      <section ref={support} id="support-us" className="support-section" aria-labelledby="support-title" tabIndex={-1}>
        <h2 id="support-title">支持我们</h2>
        <p>如果这里的内容对你有帮助，欢迎用你方便的方式支持 Sphinx。</p>
        <div className="support-actions">
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer"><Star size={19} aria-hidden="true" /><span><strong>在 GitHub 点 Star</strong><small>收藏项目，也让更多人发现它。</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
          <a href={`${repositoryUrl}/issues/new`} target="_blank" rel="noopener noreferrer"><MessageSquare size={19} aria-hidden="true" /><span><strong>反馈问题或建议</strong><small>告诉我们哪段内容需要修正，或你想学什么。</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
          <button type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(publicSiteUrl); setShareStatus('本站公开阅读链接已复制。'); }
            catch { setShareStatus(`请手动复制本站公开阅读链接：${publicSiteUrl}`); }
          }}><Share2 size={19} aria-hidden="true" /><span><strong>分享本站</strong><small>把公开阅读链接分享给需要的朋友。</small></span></button>
        </div>
        <p className="support-status" role="status">{shareStatus}</p>
        <p className="support-contact-note">不方便使用 GitHub？也可以通过下方邮箱联系我们。</p>
      </section>
      <section className="contact-section" aria-labelledby="contact-title">
        <h2 id="contact-title">联系我们</h2>
        <div className="contact-list">
          <a className="contact-row" href="mailto:zhege712@gmail.com"><Mail size={20} aria-hidden="true" /><span className="contact-service">Gmail</span><span className="contact-value">zhege712@gmail.com</span><ArrowUpRight size={16} aria-hidden="true" /></a>
          <a className="contact-row" href="mailto:qqaridae@outlook.com"><Mail size={20} aria-hidden="true" /><span className="contact-service">Outlook</span><span className="contact-value">qqaridae@outlook.com</span><ArrowUpRight size={16} aria-hidden="true" /></a>
          <a className="contact-row" href="https://search.bilibili.com/upuser?keyword=%E6%B0%B4%E5%91%8A%E7%A4%BA%E9%98%B3" target="_blank" rel="noopener noreferrer"><TvMinimal size={20} aria-hidden="true" /><span className="contact-service">Bilibili</span><span className="contact-value">水告示阳<small>搜索 Bilibili 用户</small></span><ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </section>
      <BuildCredits />
      <SiteNotice writing={writing} />
    </div>
  </article>;
}
