import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Search, X, Plus, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import SiteNotice from './SiteNotice';
import { BuildCredits } from './Brands';
import { Highlight } from './SearchResults';
import { referenceInitial as initial, compareReferenceTitles, REFERENCE_LETTERS } from '../shared/reference-index.mjs';
import { searchEntries, entryTags } from '../shared/search.mjs';
import { tagKey } from '../shared/tags.mjs';
import { KnowledgeTabs } from './Valhalla';
export { BuildCredits, BrandMark } from './Brands';
export const referenceStateKey = (writing, valhalla = false) => `sphinx-${valhalla ? 'valhalla' : 'reference'}:${writing ? 'writer' : 'reader'}`;
export function selectReferenceTag(writing, tag, valhalla = false) {
  try { sessionStorage.setItem(referenceStateKey(writing, valhalla), JSON.stringify({ query: '', letter: '', tag, scroll: 0 })); } catch {}
}
function readState(key) {
  try { const value = JSON.parse(sessionStorage.getItem(key)); return { query: typeof value?.query === 'string' ? value.query.slice(0, 160) : '', letter: /^[A-Z#]$/.test(value?.letter || '') ? value.letter : '', tag: typeof value?.tag === 'string' ? value.tag.slice(0, 32) : '', scroll: Math.max(0, Number(value?.scroll) || 0), lastId: value?.lastId }; }
  catch { return { query: '', letter: '', tag: '', scroll: 0 }; }
}
export default function References({ entries = [], onOpen, onCreate, onInitialize, compact = false, valhalla = false }) {
  const label = valhalla ? 'Valhalla' : 'Reference';
  const headingId = useId(); const root = useRef(); const restored = useRef(false);
  const panelId = useId();
  const foldKey = `sphinx-reference-expanded:${onOpen ? 'writer' : 'reader'}`;
  const [expanded, setExpanded] = useState(() => { if (!compact) return true; try { return localStorage.getItem(foldKey) === 'true'; } catch { return false; } });
  function toggleExpanded() { const next = !expanded; setExpanded(next); try { localStorage.setItem(foldKey, String(next)); } catch {} }
  const key = referenceStateKey(!!onOpen, valhalla) + (compact ? ':embedded' : '');
  const [filters, setFilters] = useState(() => readState(key)); const stored = useRef(filters);
  const { query, letter, tag } = filters;
  const persist = patch => { stored.current = { ...stored.current, ...patch }; try { sessionStorage.setItem(key, JSON.stringify(stored.current)); } catch {} };
  function update(patch) { const next = { ...stored.current, ...patch, scroll: 0, lastId: null }; persist(next); setFilters(next); const container = root.current?.closest('.reference-page'); if (container) container.scrollTop = 0; }
  useLayoutEffect(() => {
    const container = root.current?.closest('.reference-page');
    if (!container || !entries.length) return;
    if (!restored.current) { restored.current = true; container.scrollTop = stored.current.scroll; const row = stored.current.lastId && root.current.querySelector(`[data-term-id="${CSS.escape(stored.current.lastId)}"]`); row?.focus({ preventScroll: true }); }
    const remember = () => persist({ scroll: container.scrollTop });
    container.addEventListener('scroll', remember, { passive: true });
    return () => { remember(); container.removeEventListener('scroll', remember); };
  }, [entries.length]);
  const tags = entryTags(entries);
  const matches = searchEntries(entries, query).filter(({ entry }) => (!letter || initial(entry.title) === letter) && (!tag || entry.tags?.some(value => tagKey(value) === tagKey(tag))));
  const filtered = query.trim() ? matches : [...matches].sort((a, b) => compareReferenceTitles(a.entry, b.entry));
  const groups = [...new Set(filtered.map(({ entry }) => initial(entry.title)))].sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  const relatedTags = query.trim() ? entryTags(matches.map(({ entry }) => entry)).slice(0, 8) : [];
  function row({ entry, hint }) {
    const contents = <><span className="dictionary-name"><span><Highlight text={entry.title} query={query} /></span>{query && hint && <small className="search-snippet"><Highlight text={hint} query={query} /></small>}</span>{onOpen && <small>{!entry.publishedVersion ? '草稿' : entry.publishedVersion === entry.version ? '已发布' : '有未发布修改'}</small>}<ArrowRight size={14} /></>;
    const remember = () => persist({ lastId: entry.id, scroll: root.current?.closest('.reference-page')?.scrollTop || 0 });
    return onOpen ? <button data-term-id={entry.id} className="dictionary-term" key={entry.id} onClick={() => { remember(); onOpen(entry.id); }}>{contents}</button> : <a data-term-id={entry.id} className="dictionary-term" key={entry.id} href={`#/${valhalla ? 'valhalla' : 'reference'}/${entry.id}`} onClick={remember}>{contents}</a>;
  }
  return <section ref={root} className={`references dictionary ${compact ? 'dictionary-compact' : ''}`} aria-labelledby={headingId}>
    <>{!compact && <KnowledgeTabs writing={!!onOpen} valhalla={valhalla} />}</>
    <div className={`reference-heading ${compact ? 'reference-disclosure' : ''}`}><h2 id={headingId}>{compact ? <button type="button" className="reference-disclosure-toggle" aria-expanded={expanded} aria-controls={panelId} aria-label={`${expanded ? '收起' : '展开'}文章末尾的 Reference`} onClick={toggleExpanded}>{expanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}<span>Reference</span><span className="reference-fold-count">{entries.length} 个词条</span><span className="reference-fold-label">{expanded ? '收起' : '展开'}</span></button> : label}</h2>{expanded && <div className="dictionary-actions"><div className="reference-search"><Search size={16} /><input aria-label={`搜索 ${label} 词条`} maxLength={160} placeholder="名称、标签、正文或拼音" value={query} onChange={event => update({ query: event.target.value, letter: '' })} />{query && <button className="icon-button" aria-label={`清空 ${label} 搜索`} onClick={() => update({ query: '' })}><X size={14} /></button>}</div>{onCreate && <button className="primary" onClick={onCreate}><Plus size={15} />新建词条</button>}</div>}</div>
    <div id={panelId} hidden={!expanded}>
    {valhalla && <p className="valhalla-description">模型每次更新的评价、测试方法与性能记录。条目关联自 Reference。</p>}
    <div className="reference-filters">{tags.length > 0 && <label>标签<select aria-label="按标签筛选词条" value={tag} onChange={event => update({ tag: event.target.value })}><option value="">全部标签</option>{tags.map(item => <option value={item.tag} key={tagKey(item.tag)}>{item.tag}（{item.count}）</option>)}</select></label>}{(query || letter || tag) && <button className="filter-reset" onClick={() => update({ query: '', letter: '', tag: '' })}>清除筛选</button>}</div>
    {relatedTags.length > 0 && <div className="related-tags"><span>相关标签</span>{relatedTags.map(item => <button className="tag-chip" key={tagKey(item.tag)} aria-pressed={tagKey(tag) === tagKey(item.tag)} onClick={() => update({ tag: tagKey(tag) === tagKey(item.tag) ? '' : item.tag })}>{item.tag}<small>{item.count}</small></button>)}</div>}
    <nav className="reference-index" aria-label={`${label} 字母索引`}><button className={!letter ? 'active' : ''} aria-pressed={!letter} onClick={() => update({ letter: '' })}>全部</button>{[...REFERENCE_LETTERS, ...(entries.some(entry => initial(entry.title) === '#') ? ['#'] : [])].map(l => <button key={l} className={letter === l ? 'active' : ''} aria-pressed={letter === l} aria-label={l === '#' ? '其他词条（数字、符号等）' : undefined} onClick={() => update({ letter: letter === l ? '' : l })}>{l === '#' ? '其他' : l}</button>)}</nav>
    {(query || tag || letter) && <p className="search-count" role="status">找到 {filtered.length} 个词条{query.trim() ? ' · 按相关程度排序' : ''}{tag ? ` · 标签：${tag}` : ''}</p>}
    {query.trim() ? <div className="dictionary-search-list">{filtered.map(row)}</div> : <div className="dictionary-groups">{groups.map(group => <section className="dictionary-group" key={group} aria-label={`${group === '#' ? '其他' : group} 词条`}><h3>{group === '#' ? '其他' : group}</h3><div className="dictionary-terms">{filtered.filter(({ entry }) => initial(entry.title) === group).map(row)}</div></section>)}</div>}
    {!filtered.length && <p className="reference-empty" role="status">{entries.length ? '没有找到匹配词条。试试名称、标签或拼音，也可以清除筛选。' : onCreate ? '还没有词条，点击“新建词条”开始。' : valhalla ? '尚未收录模型。在 Reference 词条编辑页勾选“同步到 Valhalla”后开始编辑，发布后向读者公开。' : '词条正在整理中。'}</p>}
    {onInitialize && !entries.length && <button onClick={onInitialize}>迁移原有词条</button>}
    </div>
    <BuildCredits />
    {!compact && <SiteNotice writing={!!onOpen} />}
  </section>;
}
