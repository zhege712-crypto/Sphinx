import { ExternalLink } from 'lucide-react';
import openaiMark from './assets/brands/openai.svg';
import anthropicMark from './assets/brands/anthropic.svg';
import claudeMark from './assets/brands/claude.svg';
import deepseekMark from './assets/brands/deepseek.svg';
const marks = { openai: openaiMark, anthropic: anthropicMark, claude: claudeMark, deepseek: deepseekMark };
export function brandForUrl(url) {
  try { const host = new URL(url).hostname; const is = domain => host === domain || host.endsWith(`.${domain}`);
    if (is('openai.com') || is('chatgpt.com')) return 'openai';
    if (is('anthropic.com')) return 'anthropic';
    if (is('claude.ai') || is('claude.com')) return 'claude';
    if (is('deepseek.com')) return 'deepseek';
  } catch { /* Unfinished URLs have no provider identity. */ }
  return '';
}
export function BrandMark({ brand }) { return <span className={`reference-mark ${brand}`} aria-hidden="true">{marks[brand] ? <img src={marks[brand]} alt="" width="28" height="28" /> : <ExternalLink size={24} />}</span>; }
export function BuildCredits() { return <div className="build-credits"><span>网页构建支持</span><a href="https://openai.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="openai" />OpenAI</a><a href="https://www.deepseek.com/" target="_blank" rel="noopener noreferrer"><BrandMark brand="deepseek" />DeepSeek</a></div>; }
