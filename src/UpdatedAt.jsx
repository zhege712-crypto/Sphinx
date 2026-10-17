const formatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
export default function UpdatedAt({ document }) {
  // Only the published snapshot reaches readers; later private edits must not change this label.
  const value = document.updatedAt || document.publishedAt;
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return <div className="article-meta"><span>最近更新</span><time dateTime={value}>{formatter.format(new Date(value))}</time></div>;
}
