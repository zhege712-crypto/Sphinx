import { useEffect, useRef, useState } from 'react';
import { BookOpenText, Check, ExternalLink, X } from 'lucide-react';
import { referenceHref, referenceIdFromLink } from '../shared/reference-links.mjs';
import { websiteUrl } from './WebsiteCard';
import { searchEntries } from '../shared/search.mjs';

export default function TermLinkDialog({ target, entries = [], onApply, onRemove, onClose }) {
  const dialog = useRef();
  const existingId = referenceIdFromLink(target.href);
  const [mode, setMode] = useState(target.href && !existingId ? 'external' : 'reference');
  const [selected, setSelected] = useState(existingId || '');
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState(existingId ? '' : target.href || '');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); dialog.current.querySelector('input')?.focus(); }, []);
  const matches = searchEntries(entries, query).map(result => result.entry);
  const chosen = entries.find(entry => entry.id === selected);
  function submit(event) {
    event.preventDefault();
    try {
      if (mode === 'reference' && !chosen) throw new Error('请选择一个 Reference 词条');
      const href = mode === 'reference' ? referenceHref(chosen.id) : websiteUrl(url.trim());
      if (!href) throw new Error('请输入完整的 http 或 https 网址');
      onApply(href);
    } catch (e) { setError(e.message); }
  }
  return <dialog className="dialog term-link-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="term-link-title">
    <div className="dialog-heading"><h2 id="term-link-title">词汇链接</h2><button type="button" className="icon-button" aria-label="关闭词汇链接" onClick={onClose}><X size={18} /></button></div>
    <p className="term-link-word">已选词汇<strong>{target.text}</strong></p>
    <form onSubmit={submit}>
      <div className="link-target-types" aria-label="链接目标类型">
        <button type="button" aria-pressed={mode === 'reference'} onClick={() => { setMode('reference'); setError(''); }}><BookOpenText size={16} />站内 Reference</button>
        <button type="button" aria-pressed={mode === 'external'} onClick={() => { setMode('external'); setError(''); }}><ExternalLink size={16} />站外网址</button>
      </div>
      {mode === 'reference' ? <>
        <label className="term-link-search">搜索词条<input aria-label="搜索链接词条" maxLength={160} placeholder="名称、标签、正文或拼音" autoFocus value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className="term-link-results" aria-label="Reference 链接目标">{matches.map(entry => <button type="button" key={entry.id} aria-pressed={selected === entry.id} onClick={() => { setSelected(entry.id); setError(''); }}><span>{entry.title}</span>{!entry.publishedVersion && <small>尚未发布</small>}{selected === entry.id && <Check size={16} />}</button>)}{!matches.length && <p>{entries.length ? '没有找到相关词条，请换个名称搜索。' : '还没有 Reference 词条，请先新建词条。'}</p>}</div>
        {chosen && <p className="term-link-hint">链接到：{chosen.title}{!chosen.publishedVersion && ' · 发布该词条后读者才能访问'}</p>}
      </> : <label>目标网址<input aria-label="词汇链接网址" inputMode="url" autoFocus placeholder="https://" maxLength={2048} value={url} onChange={event => { setUrl(event.target.value); setError(''); }} /><small>站外链接将在新标签页打开。</small></label>}
      {error && <p className="term-link-error" role="alert">{error}</p>}
      <div className="dialog-actions">{target.href && <button type="button" className="term-link-remove" onClick={() => { try { onRemove(); } catch (e) { setError(e.message); } }}>移除链接</button>}<button type="button" onClick={onClose}>取消</button><button className="primary" disabled={mode === 'reference' ? !chosen : !url.trim()}>应用链接</button></div>
    </form>
  </dialog>;
}
