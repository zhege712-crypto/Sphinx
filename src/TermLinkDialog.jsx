import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, Check, ExternalLink, Mail, X } from 'lucide-react';
import { referenceHref, referenceIdFromLink } from '../shared/reference-links.mjs';
import { websiteUrl } from './WebsiteCard';
import { emailAddress, emailHref } from '../shared/email-links.mjs';
import { searchEntries } from '../shared/search.mjs';
import { createTermIndex, exactTermMatches, preferredTermMatch } from '../shared/term-matches.mjs';

export default function TermLinkDialog({ target, entries = [], onApply, onRemove, onClose }) {
  const dialog = useRef();
  const existingId = referenceIdFromLink(target.href);
  const index = useMemo(() => createTermIndex(entries), [entries]);
  const exact = useMemo(() => exactTermMatches(index, target.text), [index, target.text]);
  const isEmail = /^mailto:/i.test(target.href || '');
  const [mode, setMode] = useState(isEmail ? 'email' : target.href && !existingId ? 'external' : 'reference');
  const [email, setEmail] = useState(() => { try { return isEmail ? emailAddress(target.href) : ''; } catch { return target.href || ''; } });
  const [selected, setSelected] = useState(existingId || preferredTermMatch(exact)?.id || '');
  const [query, setQuery] = useState(target.text.trim().slice(0, 160));
  const [url, setUrl] = useState(existingId ? '' : target.href || '');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); dialog.current.querySelector('input')?.focus(); }, []);
  const matches = useMemo(() => {
    const found = searchEntries(entries, query).map(result => result.entry);
    const exactIds = new Set(exactTermMatches(index, query).map(entry => entry.id));
    return [...found.filter(entry => exactIds.has(entry.id)), ...found.filter(entry => !exactIds.has(entry.id))];
  }, [entries, index, query]);
  const chosen = entries.find(entry => entry.id === selected);
  function submit(event) {
    event.preventDefault();
    try {
      if (mode === 'reference' && !chosen) throw new Error('请选择一个 Reference 词条');
      const href = mode === 'reference' ? referenceHref(chosen.id) : mode === 'email' ? emailHref(email) : /^mailto:/i.test(url.trim()) ? emailHref(url) : websiteUrl(url.trim());
      if (!href) throw new Error('请输入完整的 http 或 https 网址');
      onApply(href);
    } catch (e) { setError(e.message); }
  }
  return <dialog className="dialog term-link-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="term-link-title">
    <div className="dialog-heading"><h2 id="term-link-title">词汇链接</h2><button type="button" className="icon-button" aria-label="关闭词汇链接" onClick={onClose}><X size={18} /></button></div>
    <p className="term-link-word">已选词汇<strong>{target.text}</strong></p>
    <form onSubmit={submit} noValidate>
      <div className="link-target-types" aria-label="链接目标类型">
        <button type="button" aria-pressed={mode === 'reference'} onClick={() => { setMode('reference'); setError(''); }}><BookOpenText size={16} />站内 Reference</button>
        <button type="button" aria-pressed={mode === 'external'} onClick={() => { setMode('external'); setError(''); }}><ExternalLink size={16} />站外网址</button>
        <button type="button" aria-pressed={mode === 'email'} onClick={() => { setMode('email'); setError(''); }}><Mail size={16} />邮箱</button>
      </div>
      {mode === 'reference' ? <>
        <div className="term-link-search-row"><label className="term-link-search">搜索词条<input aria-label="搜索链接词条" maxLength={160} placeholder="名称、标签、正文或拼音" autoFocus value={query} onChange={event => setQuery(event.target.value)} /></label>{query && <button type="button" onClick={() => setQuery('')}>查看全部</button>}</div>
        <div className="term-link-results" aria-label="Reference 链接目标">{matches.map(entry => <button type="button" key={entry.id} aria-pressed={selected === entry.id} onClick={() => { setSelected(entry.id); setError(''); }}><span>{entry.title}</span>{exact.some(match => match.id === entry.id) && <small className="term-link-exact">同名词条</small>}{!entry.publishedVersion && <small>尚未发布</small>}{selected === entry.id && <Check size={16} />}</button>)}{!matches.length && <p>{entries.length ? '没有找到相关词条，请换个名称搜索，或查看全部。' : '还没有 Reference 词条，请先新建词条。'}</p>}</div>
        {chosen && <p className="term-link-hint">链接到：{chosen.title}{!chosen.publishedVersion && ' · 发布该词条后读者才能访问'}</p>}
      </> : mode === 'email' ? <label>邮箱地址<input aria-label="链接邮箱地址" type="email" inputMode="email" autoCapitalize="none" spellCheck={false} autoFocus placeholder="name@example.com" maxLength={2048} value={email} aria-invalid={!!error} aria-describedby={error ? 'term-link-error' : 'email-link-hint'} onChange={event => { setEmail(event.target.value); setError(''); }} /><small id="email-link-hint">支持邮箱地址或 mailto: 链接。点击后使用读者的邮件应用撰写邮件。</small></label> : <label>目标网址<input aria-label="词汇链接网址" inputMode="url" autoFocus placeholder="https://" maxLength={2048} value={url} onChange={event => { setUrl(event.target.value); setError(''); }} /><small>网页在新标签页打开；mailto: 链接使用邮件应用。</small></label>}
      {error && <p id="term-link-error" className="term-link-error" role="alert">{error}</p>}
      <div className="dialog-actions">{target.href && <button type="button" className="term-link-remove" onClick={() => { try { onRemove(); } catch (e) { setError(e.message); } }}>移除链接</button>}<button type="button" onClick={onClose}>取消</button><button className="primary" disabled={mode === 'reference' ? !chosen : mode === 'email' ? !email.trim() : !url.trim()}>应用链接</button></div>
    </form>
  </dialog>;
}
