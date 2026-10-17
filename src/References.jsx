import { useId, useState } from 'react';
import { Search, X, Plus, ArrowRight } from 'lucide-react';
import { BuildCredits } from './Brands';
import { referenceInitial as initial, compareReferenceTitles, REFERENCE_LETTERS } from '../shared/reference-index.mjs';
export { BuildCredits, BrandMark } from './Brands';
export default function References({ entries = [], onOpen, onCreate, onInitialize, compact = false }) {
  const headingId = useId();
  const [query, setQuery] = useState(''); const [letter, setLetter] = useState('');
  const filtered = entries.filter(entry => (!letter || initial(entry.title) === letter) && `${entry.title} ${entry.text || ''}`.toLowerCase().includes(query.trim().toLowerCase())).sort(compareReferenceTitles);
  const groups = [...new Set(filtered.map(entry => initial(entry.title)))].sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b));
  return <section className={`references dictionary ${compact ? 'dictionary-compact' : ''}`} aria-labelledby={headingId}>
    <div className="reference-heading"><h2 id={headingId}>Reference</h2><div className="dictionary-actions"><div className="reference-search"><Search size={16} /><input aria-label="搜索 Reference 词条" placeholder="搜索词条" value={query} onChange={event => { setQuery(event.target.value); setLetter(''); }} />{query && <button className="icon-button" aria-label="清空 Reference 搜索" onClick={() => setQuery('')}><X size={14} /></button>}</div>{onCreate && <button className="primary" onClick={onCreate}><Plus size={15} />新建词条</button>}</div></div>
    <nav className="reference-index" aria-label="Reference 字母索引"><button className={!letter ? 'active' : ''} aria-pressed={!letter} onClick={() => setLetter('')}>全部</button>{[...REFERENCE_LETTERS, ...(entries.some(entry => initial(entry.title) === '#') ? ['#'] : [])].map(l => <button key={l} className={letter === l ? 'active' : ''} aria-pressed={letter === l} aria-label={l === '#' ? '其他词条（数字、符号等）' : undefined} onClick={() => setLetter(letter === l ? '' : l)}>{l === '#' ? '其他' : l}</button>)}</nav>
    <div className="dictionary-groups">{groups.map(group => <section className="dictionary-group" key={group} aria-label={`${group === '#' ? '其他' : group} 词条`}><h3>{group === '#' ? '其他' : group}</h3><div className="dictionary-terms">{filtered.filter(entry => initial(entry.title) === group).map(entry => {
      const contents = <><span>{entry.title}</span>{onOpen && <small>{!entry.publishedVersion ? '草稿' : entry.publishedVersion === entry.version ? '已发布' : '有未发布修改'}</small>}<ArrowRight size={14} /></>;
      return onOpen ? <button className="dictionary-term" key={entry.id} onClick={() => onOpen(entry.id)}>{contents}</button> : <a className="dictionary-term" key={entry.id} href={`#/reference/${entry.id}`}>{contents}</a>;
    })}</div></section>)}</div>
    {!filtered.length && <p className="reference-empty" role="status">{entries.length ? '没有找到匹配的词条' : onCreate ? '还没有词条，点击“新建词条”开始。' : '词条正在整理中。'}</p>}
    {onInitialize && !entries.length && <button onClick={onInitialize}>迁移原有词条</button>}
    <BuildCredits />
  </section>;
}
