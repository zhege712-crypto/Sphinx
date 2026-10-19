import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import './copy-block.css';

export default function CopyBlock({ text, language = 'text', id, contentStyle }) {
  const [status, setStatus] = useState('idle');
  const version = useRef(0);
  useEffect(() => { version.current++; setStatus('idle'); return () => { version.current++; }; }, [text]);
  const label = language === 'text' || !language ? '文本' : language;
  async function copy() {
    const current = version.current;
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(text);
      if (current === version.current) setStatus('copied');
    } catch {
      if (current === version.current) setStatus('error');
    }
  }
  const Icon = status === 'copied' ? Check : status === 'copying' ? Loader2 : Copy;
  return <section id={id} className="copy-block" aria-label="可复制内容">
    <div className="copy-block-header"><span className="copy-block-language">{label}</span><button className="copy-code-button" type="button" onClick={copy} disabled={!text.length || status === 'copying'} aria-label={status === 'copied' ? '已复制内容，再次复制' : '复制这段内容'}><Icon size={15} className={status === 'copying' ? 'spin' : undefined} aria-hidden="true" />{status === 'copied' ? '已复制' : status === 'copying' ? '复制中' : status === 'error' ? '重试复制' : '复制'}</button></div>
    <pre tabIndex={0} aria-label={`${label}内容`} style={contentStyle}><code>{text}</code></pre>
    <span role="status" className={status === 'error' ? 'copy-block-error' : 'copy-block-announcement'}>{status === 'copied' ? '内容已复制到剪贴板' : status === 'error' ? '复制未完成，请重试，或选中内容手动复制。' : ''}</span>
  </section>;
}
