import { forwardRef, useId, useImperativeHandle, useState } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { safeTags, tagKey } from '../shared/tags.mjs';
import { entryTags } from '../shared/search.mjs';

export function TagList({ tags = [], onSelect }) {
  if (!tags.length) return null;
  return <div className="tag-list" aria-label="词条标签">{tags.map(tag => onSelect ? <button className="tag-chip" key={tagKey(tag)} onClick={() => onSelect(tag)}><Tag size={13} />{tag}</button> : <span className="tag-chip" key={tagKey(tag)}><Tag size={13} />{tag}</span>)}</div>;
}

export const TagEditor = forwardRef(function TagEditor({ tags, entries, onChange, onPending }, ref) {
  const listId = useId(); const [input, setInput] = useState(''); const [error, setError] = useState('');
  function pending(value) { setInput(value); onPending(value); }
  function commit() {
    if (!input.trim()) return;
    try { const next = safeTags([...tags, ...input.split(/[,，\n]/).map(s => s.trim()).filter(Boolean)]); pending(''); onChange(next); setError(''); }
    catch (e) { setError(e.message); throw e; }
  }
  useImperativeHandle(ref, () => ({ commit, hasPending: () => !!input.trim(), restore: value => pending(value) }));
  const suggestions = entryTags(entries || []).filter(({ tag }) => !tags.some(current => tagKey(current) === tagKey(tag)));
  return <section className="tag-editor" aria-label="编辑词条标签"><div className="tag-editor-heading"><Tag size={15} /><span>标签</span><small>{tags.length}/12</small></div>
    <div className="tag-list">{tags.map(tag => <span className="tag-chip" key={tagKey(tag)}>{tag}<button type="button" aria-label={`移除标签 ${tag}`} onClick={() => onChange(tags.filter(item => item !== tag))}><X size={13} /></button></span>)}</div>
    <form className="tag-input-row" onSubmit={event => { event.preventDefault(); try { commit(); } catch { /* Shown beside the field. */ } }}>
      <input aria-label="添加词条标签" aria-describedby={`${listId}-hint`} list={listId} maxLength={420} value={input} placeholder="输入或选择标签" onChange={event => { pending(event.target.value); setError(''); }} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} />
      <datalist id={listId}>{suggestions.map(({ tag }) => <option value={tag} key={tagKey(tag)} />)}</datalist>
      <button type="submit" disabled={!input.trim()}><Plus size={15} />添加</button>
    </form><p id={`${listId}-hint`} className="tag-editor-hint">按 Enter 添加，多个标签用逗号分隔；随词条发布后公开。</p>{error && <p className="tag-error" role="alert">{error}</p>}
  </section>;
});
