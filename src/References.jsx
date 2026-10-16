import { useState } from 'react';
import { ArrowUpRight, Search, Sparkles, Waves } from 'lucide-react';
const entries = [
  { name: 'ChatGPT', provider: 'OpenAI', url: 'https://chatgpt.com/', icon: 'openai' },
  { name: 'Claude', provider: 'Anthropic', url: 'https://claude.ai/', icon: 'anthropic' },
  { name: 'Codex', provider: 'OpenAI', url: 'https://developers.openai.com/codex/', icon: 'openai' },
  { name: 'GPT', provider: 'OpenAI', url: 'https://developers.openai.com/api/docs/models', icon: 'openai' },
  { name: 'DeepSeek', provider: 'DeepSeek', url: 'https://www.deepseek.com/', icon: 'deepseek' },
];
export function BrandMark({ brand }) { return <span className={`reference-mark ${brand}`} aria-hidden="true">{brand === 'openai' ? <Sparkles size={25} /> : brand === 'deepseek' ? <Waves size={25} /> : 'A'}</span>; }
export function BuildCredits() { return <div className="build-credits"><span>网页构建支持</span><a href="https://openai.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="openai" />OpenAI</a><a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="deepseek" />DeepSeek</a></div>; }
export default function References() {
  const [query, setQuery] = useState(''); const [letter, setLetter] = useState('');
  const filtered = entries.filter((e) => (!letter || e.name.toUpperCase().startsWith(letter)) && `${e.name} ${e.provider} ${e.url}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="references" aria-labelledby="references-title"><div className="reference-heading"><h2 id="references-title">Reference</h2><label className="reference-search"><Search size={16} /><input aria-label="搜索 Reference" placeholder="搜索" value={query} onChange={(e) => { setQuery(e.target.value); setLetter(''); }} /></label></div><nav className="reference-index" aria-label="Reference 字母索引"><button className={!letter ? 'active' : ''} onClick={() => setLetter('')}>全部</button>{Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).map((l)=><button key={l} className={letter===l?'active':''} aria-pressed={letter===l} onClick={()=>setLetter(letter===l?'':l)}>{l}</button>)}</nav><div className="reference-cards">{filtered.sort((a,b)=>a.name.localeCompare(b.name)).map((e)=><a className="reference-card" key={e.name} href={e.url} target="_blank" rel="noopener noreferrer"><BrandMark brand={e.icon} /><span><strong>{e.name} · {e.provider}</strong><small>{e.url}</small></span><ArrowUpRight size={18} /></a>)}{!filtered.length&&<p className="reference-empty" role="status">暂无匹配结果</p>}</div><BuildCredits /></section>;
}
