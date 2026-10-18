import './site-notice.css';

export default function SiteNotice({ writing = false }) {
  return <footer className="site-notice" aria-label="免责声明">
    <p><strong>免责声明</strong> 本站内容由成员自行研究并自愿分享，可能存在疏漏或错误，敬请谅解。如发现问题，欢迎通过<a href={writing ? '#/write/about' : '#/about'}>关于与联系</a>中的联系方式向我们反馈，帮助改进。感谢你的支持！</p>
    <p>本站内容不代表文中涉及的模型、软件及其所属公司的官方立场；相关公司的观点与立场亦不代表本站。请读者自行甄别。</p>
  </footer>;
}
