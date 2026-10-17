import { useId, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import openaiMark from './assets/brands/openai.svg';
import anthropicMark from './assets/brands/anthropic.svg';
import claudeMark from './assets/brands/claude.svg';
import deepseekMark from './assets/brands/deepseek.svg';
const entries = [
  { name: 'Anthropic 模型', provider: 'Anthropic', url: 'https://platform.claude.com/docs/en/models/overview', icon: 'anthropic' },
  { name: 'ChatGPT', provider: 'OpenAI', url: 'https://chatgpt.com/', icon: 'openai' },
  { name: 'Claude', provider: 'Anthropic', url: 'https://claude.ai/', icon: 'claude' },
  { name: 'Claude Haiku', provider: 'Anthropic', url: 'https://platform.claude.com/docs/en/models/haiku-5-5/overview', icon: 'claude' },
  { name: 'Claude Opus', provider: 'Anthropic', url: 'https://platform.claude.com/docs/en/models/opus-5-5/overview', icon: 'claude' },
  { name: 'Claude Sonnet', provider: 'Anthropic', url: 'https://platform.claude.com/docs/en/models/sonnet-5-5/overview', icon: 'claude' },
  { name: 'Codex', provider: 'OpenAI', url: 'https://developers.openai.com/codex/', icon: 'openai' },
  { name: 'GPT', provider: 'OpenAI', url: 'https://developers.openai.com/api/docs/models', icon: 'openai' },
  { name: 'GPT-6 Astra', provider: 'OpenAI', url: 'https://developers.openai.com/api/docs/models/gpt-6-astra', icon: 'openai' },
  { name: 'GPT-6.1 Sol', provider: 'OpenAI', url: 'https://developers.openai.com/api/docs/models/gpt-6.1-sol', icon: 'openai' },
  { name: 'GPT-6 Luna', provider: 'OpenAI', url: 'https://developers.openai.com/api/docs/models/gpt-6-luna', icon: 'openai' },
  { name: 'DeepSeek', provider: 'DeepSeek', url: 'https://www.deepseek.com/', icon: 'deepseek' },
];
const marks = { openai: openaiMark, anthropic: anthropicMark, claude: claudeMark, deepseek: deepseekMark };
export function BrandMark({ brand }) { return <span className={`reference-mark ${brand}`} aria-hidden="true"><img src={marks[brand]} alt="" width="28" height="28" /></span>; }
export function BuildCredits() { return <div className="build-credits"><span>网页构建支持</span><a href="https://openai.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="openai" />OpenAI</a><a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="deepseek" />DeepSeek</a></div>; }
export default function References() {
  const headingId = useId();
  const [query, setQuery] = useState(''); const [letter, setLetter] = useState('');
  const filtered = entries.filter((e) => (!letter || e.name.toUpperCase().startsWith(letter)) && `${e.name} ${e.provider} ${e.url}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="references" aria-labelledby={headingId}>
    <div className="reference-heading"><h2 id={headingId}>Reference</h2><div className="reference-search"><Search size={16} /><input aria-label="搜索 Reference" placeholder="搜索模型、产品或网址" value={query} onChange={(e) => { setQuery(e.target.value); setLetter(''); }} />{query && <button className="icon-button" aria-label="清空 Reference 搜索" onClick={() => setQuery('')}><X size={14} /></button>}</div></div>
    <nav className="reference-index" aria-label="Reference 字母索引"><button className={!letter ? 'active' : ''} aria-pressed={!letter} onClick={() => setLetter('')}>全部</button>{Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((l) => <button key={l} className={letter === l ? 'active' : ''} aria-pressed={letter === l} onClick={() => setLetter(letter === l ? '' : l)}>{l}</button>)}</nav>
    <div className="reference-cards">{filtered.sort((a, b) => a.name.localeCompare(b.name)).map((e) => <a className="reference-card" key={e.name} href={e.url} target="_blank" rel="noopener noreferrer"><BrandMark brand={e.icon} /><span><strong>{e.name} · {e.provider}</strong><small>{e.url}</small></span><ArrowUpRight size={18} /></a>)}{!filtered.length && <p className="reference-empty" role="status">暂无匹配结果</p>}</div>
    <BuildCredits />
  </section>;
}
