import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BookUser, ExternalLink, Loader2, Mail, Plus, Search, X } from 'lucide-react';
import { api } from './api';
import { filterAuthors } from '../shared/authors.mjs';
import './authors.css';

const emptyAuthor = () => ({ name: '', email: '', github: '', links: [] });
export function AuthorContacts({ author }) {
  return <span className="author-contacts">{author.email && <a href={`mailto:${encodeURIComponent(author.email)}`}><Mail size={13} />{author.email}</a>}{author.github && <a href={`https://github.com/${author.github}`} target="_blank" rel="noopener noreferrer">@{author.github}<ExternalLink size={12} /></a>}{(author.links || []).map((link, index) => <a key={index} href={link.url} target={link.url.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">{link.label}<ExternalLink size={12} /></a>)}</span>;
}

export default forwardRef(function Authors({ toast, onBack }, ref) {
  const [authors, setAuthors] = useState([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); const [form, setForm] = useState(emptyAuthor);
  const [saving, setSaving] = useState(false); const [stale, setStale] = useState(false); const nameInput = useRef();
  const pending = useRef(null);
  const editingDirty = !!editing && JSON.stringify({ name: form.name, email: form.email, github: form.github, links: form.links }) !== JSON.stringify(editing.id ? { name: editing.name, email: editing.email, github: editing.github, links: editing.links } : emptyAuthor());
  async function load() { setLoading(true); setError(''); try { const result = await api('/api/authors'); setAuthors(result.authors); return result.authors; } catch (err) { setError(err.message); } finally { setLoading(false); } }
  useEffect(() => { let active = true; api('/api/authors').then(result => { if (active) setAuthors(result.authors); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  async function edit(author) { if (editingDirty || pending.current) { try { const saved = await save(); if (author?.id === saved?.id) author = saved; } catch { return; } } setEditing(author || {}); setForm(author ? { ...author, links: author.links.map(link => ({ ...link })) } : emptyAuthor()); setStale(false); setError(''); setTimeout(() => nameInput.current?.focus(), 0); }
  function change(key, value) { setForm(previous => ({ ...previous, [key]: value })); }
  function changeLink(index, key, value) { change('links', form.links.map((link, i) => i === index ? { ...link, [key]: value } : link)); }
  async function save(event) {
    event?.preventDefault(); if (pending.current) return pending.current;
    if (!editing || !editingDirty) { setEditing(null); return; }
    if (stale) throw new Error('作者信息已变化，请先核对最新内容');
    setSaving(true); setError('');
    pending.current = (async () => {
      try {
        const result = await api(editing.id ? `/api/authors/${editing.id}` : '/api/authors', { method: editing.id ? 'PUT' : 'POST', body: JSON.stringify(form) });
        setAuthors(previous => [...previous.filter(author => author.id !== result.author.id), result.author].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')));
        setEditing(null); toast?.('作者信息已保存，仅供工作台使用'); return result.author;
      } catch (err) { setError(err.message); setStale(err.status === 409); throw err; } finally { setSaving(false); pending.current = null; }
    })();
    return pending.current;
  }
  useImperativeHandle(ref, () => ({ flush: () => pending.current || (editingDirty ? save() : Promise.resolve()) }));
  useEffect(() => { const prevent = event => { if (editingDirty || saving) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [editingDirty, saving]);
  async function reloadAuthor() { const latest = await load(); const author = latest?.find(row => row.id === editing?.id); if (author) edit(author); }
  const matches = filterAuthors(authors, query);
  return <section className="authors-page">
    <header className="authors-header"><div>{onBack && <button type="button" className="text-button" onClick={onBack}>返回</button>}<h1><BookUser size={25} />作者索引</h1><p>集中管理作者和联系方式，再关联到文章或词条。</p><span className="author-private-note">仅后台可见 · 不会随文章发布给读者</span></div><button type="button" className="primary" onClick={() => edit(null)} disabled={saving}><Plus size={16} />添加作者</button></header>
    <label className="authors-search"><Search size={17} /><input aria-label="搜索作者" placeholder="搜索姓名、邮箱、GitHub 或链接" value={query} onChange={event => setQuery(event.target.value)} /></label>
    {error && <div className="authors-error" role="alert">{error}{!editing && <button type="button" onClick={load}>重试</button>}</div>}
    <div className="authors-layout">
      <div className="authors-index" aria-busy={loading}>{loading ? <p className="authors-empty"><Loader2 size={16} className="spin" />正在加载作者…</p> : !matches.length ? <p className="authors-empty">{query ? '没有找到匹配的作者，试试姓名或邮箱。' : '还没有作者。添加后即可在编辑页快速关联。'}</p> : <ul>{matches.map(author => <li key={author.id} className={editing?.id === author.id ? 'is-selected' : ''}><div><strong>{author.name}</strong><AuthorContacts author={author} /></div><button type="button" onClick={() => edit(author)} disabled={saving} aria-label={`编辑 ${author.name}`}>编辑</button></li>)}</ul>}</div>
      {editing && <form className="author-form" onSubmit={event => save(event).catch(() => {})}><header><h2>{editing.id ? '编辑作者' : '添加作者'}</h2><button type="button" className="icon-button" aria-label="关闭作者编辑" onClick={() => setEditing(null)} disabled={saving}><X size={18} /></button></header>
        <label>名称<input ref={nameInput} required maxLength={80} value={form.name} onChange={event => change('name', event.target.value)} autoComplete="off" disabled={saving} /></label>
        <label>邮箱<input type="email" maxLength={254} value={form.email} placeholder="可选" onChange={event => change('email', event.target.value)} autoComplete="off" disabled={saving} /></label>
        <label>GitHub<input maxLength={100} value={form.github} placeholder="用户名或个人主页链接，可选" onChange={event => change('github', event.target.value)} autoComplete="off" disabled={saving} /></label>
        <fieldset disabled={saving}><legend>其他链接</legend>{form.links.map((link, index) => <div className="author-link-fields" key={index}><input aria-label={`链接 ${index + 1} 名称`} required maxLength={80} placeholder="名称，如个人网站" value={link.label} onChange={event => changeLink(index, 'label', event.target.value)} /><input aria-label={`链接 ${index + 1} 网址`} required maxLength={2048} placeholder="https:// 或 mailto:" value={link.url} onChange={event => changeLink(index, 'url', event.target.value)} /><button type="button" className="icon-button" aria-label={`移除链接 ${index + 1}`} onClick={() => change('links', form.links.filter((_, i) => i !== index))}><X size={15} /></button></div>)}<button type="button" onClick={() => change('links', [...form.links, { label: '', url: '' }])} disabled={form.links.length >= 8}><Plus size={14} />添加链接</button></fieldset>
        <footer>{stale ? <button type="button" onClick={reloadAuthor}>放弃输入并加载最新信息</button> : <button type="submit" className="primary" disabled={saving}>{saving ? '正在保存…' : '保存作者'}</button>}<button type="button" onClick={() => setEditing(null)} disabled={saving}>取消</button></footer>
      </form>}
    </div>
  </section>;
});
