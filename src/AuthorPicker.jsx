import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, UserRound } from 'lucide-react';
import { api } from './api';
import { filterAuthors, MAX_DOCUMENT_AUTHORS } from '../shared/authors.mjs';
import { AuthorContacts } from './Authors';
import './authors.css';

export default forwardRef(function AuthorPicker({ documentId, toast, manageHref = '#/write/authors' }, ref) {
  const [authors, setAuthors] = useState([]); const [saved, setSaved] = useState([]); const [selected, setSelected] = useState([]);
  const [version, setVersion] = useState(0); const [query, setQuery] = useState(''); const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [stale, setStale] = useState(false);
  const pending = useRef(null);
  async function load() {
    setLoading(true); setError('');
    try { const [index, association] = await Promise.all([api('/api/authors'), api(`/api/documents/${documentId}/authors`)]); setAuthors(index.authors); setSaved(association.authorIds); setSelected(association.authorIds); setVersion(association.version); setStale(false); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setOpen(false); setStale(false); setQuery(''); setSaved([]); setSelected([]);
    Promise.all([api('/api/authors'), api(`/api/documents/${documentId}/authors`)]).then(([index, association]) => { if (!active) return; setAuthors(index.authors); setSaved(association.authorIds); setSelected(association.authorIds); setVersion(association.version); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);
  function toggle(id) { setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : previous.length < MAX_DOCUMENT_AUTHORS ? [...previous, id] : previous); }
  const dirty = selected.length !== saved.length || selected.some((id, index) => id !== saved[index]);
  async function save() {
    if (pending.current) return pending.current;
    if (!dirty) return;
    if (loading || stale) throw new Error(stale ? '作者关联已变化，请先核对最新关联' : '作者信息尚未加载完毕');
    setSaving(true); setError('');
    pending.current = (async () => {
      try { const result = await api(`/api/documents/${documentId}/authors`, { method: 'PUT', body: JSON.stringify({ authorIds: selected, version }) }); setSaved(result.authorIds); setSelected(result.authorIds); setVersion(result.version); setOpen(false); toast?.('作者关联已保存，仅后台可见'); return result; } catch (err) { setError(err.message); setStale(err.status === 409); throw err; } finally { setSaving(false); pending.current = null; }
    })();
    return pending.current;
  }
  useImperativeHandle(ref, () => ({ flush: save }));
  useEffect(() => { const prevent = event => { if (dirty || saving) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [dirty, saving]);
  return <div className="author-picker">
    <button type="button" className="author-picker-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><UserRound size={15} /><span>作者</span><span className="author-picker-summary">{loading ? '加载中…' : saved.length ? saved.map(id => authors.find(author => author.id === id)?.name).filter(Boolean).join('、') : '未关联'}</span><span className="author-private-note">仅后台</span><ChevronDown size={14} /></button>
    {error && <div className="authors-error" role="alert">{error}<button type="button" disabled={saving} onClick={load}>{stale ? '放弃选择并加载最新关联' : '重试'}</button></div>}
    {open && <div className="author-picker-panel"><p>联系方式和作者关联仅供创作伙伴使用，不会公开。关联单独保存，离开编辑页时也会保存。</p><label className="authors-search"><Search size={15} /><input aria-label="查找要关联的作者" placeholder="搜索名称、邮箱或链接" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {loading ? <p className="authors-empty"><Loader2 size={15} className="spin" />正在加载…</p> : <ul className="author-picker-list">{filterAuthors(authors, query).map(author => <li key={author.id}><label><input type="checkbox" checked={selected.includes(author.id)} disabled={saving || stale || (!selected.includes(author.id) && selected.length >= MAX_DOCUMENT_AUTHORS)} onChange={() => toggle(author.id)} /><span>{author.name}</span></label><AuthorContacts author={author} /></li>)}{!filterAuthors(authors, query).length && <li className="authors-empty">{query ? '没有匹配的作者' : '还没有作者，请先到作者索引添加。'}</li>}</ul>}
      <footer><a href={manageHref}>管理作者索引</a><span>{selected.length}/{MAX_DOCUMENT_AUTHORS}</span><button type="button" onClick={() => { setSelected(saved); setOpen(false); }} disabled={saving}>取消</button><button type="button" className="primary" disabled={loading || saving || stale || !dirty || !!error} onClick={() => save().catch(() => {})}>{saving ? '正在保存…' : '保存关联'}</button></footer>
    </div>}
  </div>;
});
