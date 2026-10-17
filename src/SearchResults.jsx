import { BookOpenText, FileText } from 'lucide-react';
import { searchEntries } from '../shared/search.mjs';
export function Highlight({ text = '', query = '' }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 12);
  if (!terms.length) return text;
  const regex = new RegExp(`(${terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return text.split(regex).map((part, i) => i % 2 ? <mark key={i}>{part}</mark> : part);
}
export default function SearchResults({ entries, query, onSelect }) {
  const matches = searchEntries(entries, query);
  return <section className="site-search-results" aria-label="文档与词条搜索结果"><p className="search-count" role="status">找到 {matches.length} 项内容</p>{matches.map(({ entry, hint }) => {
    const Icon = entry.kind === 'reference' ? BookOpenText : FileText;
    return <button className="site-search-result" key={entry.id} onClick={() => onSelect(entry)}><Icon size={16} /><span><strong><Highlight text={entry.title} query={query} /></strong><small>{entry.kind === 'reference' ? 'Reference 词条' : entry.kind === 'folder' ? '目录' : '指南'}</small>{entry.tags?.length > 0 && <small className="search-tags">{entry.tags.join(' · ')}</small>}{hint && <span className="search-snippet"><Highlight text={hint} query={query} /></span>}</span></button>;
  })}{!matches.length && <p className="sidebar-empty">试试名称、正文、标签或拼音；多个关键词用空格分隔。</p>}</section>;
}
