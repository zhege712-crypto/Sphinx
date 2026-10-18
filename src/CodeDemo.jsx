import { useEffect, useRef, useState } from 'react';
import { Code2, Play, RotateCcw, Square } from 'lucide-react';
import { DEMO_SANDBOX, DEMO_HEIGHTS } from '../shared/code-demo.mjs';
import CopyBlock from './CopyBlock';
import './code-demo.css';

export default function CodeDemo({ source = '', title = '', height = 400, id, showSource = true }) {
  const iframe = useRef();
  const sequence = useRef(0);
  const [run, setRun] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  useEffect(() => { setRun(null); setStatus('idle'); setError(''); }, [source]);
  useEffect(() => {
    if (!run) return;
    let ready = false, failed = false;
    const receive = event => {
      if (event.source !== iframe.current?.contentWindow) return;
      if (event.data?.sphinxDemo === 'ready' && !ready) {
        ready = true;
        iframe.current.contentWindow.postMessage({ sphinxDemo: 'run', source: run.source }, '*');
      } else if (event.data?.sphinxDemo === 'loaded' && ready && !failed) setStatus('running');
      else if (event.data?.sphinxDemo === 'error' && ready) { failed = true; setStatus('error'); setError(String(event.data.message || '代码运行出错').slice(0, 500)); }
    };
    window.addEventListener('message', receive);
    const timeout = setTimeout(() => { if (!ready) { setStatus('error'); setError('演示窗口未能加载，请重新运行或稍后刷新页面。'); } }, 8000);
    return () => { window.removeEventListener('message', receive); clearTimeout(timeout); };
  }, [run]);
  function start() { setError(''); setStatus('loading'); setRun({ id: ++sequence.current, source }); }
  function stop() { setRun(null); setError(''); setStatus('stopped'); }
  return <section id={id} className="code-demo" aria-label={title || '代码演示'}>
    <div className="code-demo-header"><span className="code-demo-title"><Code2 size={16} aria-hidden="true" />{title || '代码演示'}</span><div className="code-demo-actions"><button type="button" onClick={start} disabled={!source.trim()}><>{run ? <RotateCcw size={15} /> : <Play size={15} />}{run ? '重新运行' : '运行演示'}</></button>{run && <button type="button" onClick={stop}><Square size={14} />停止</button>}</div></div>
    <div className="code-demo-stage" style={{ height: DEMO_HEIGHTS.includes(height) ? height : 400 }}>
      {run ? <iframe key={run.id} ref={iframe} src={new URL('demo-runner.html', document.baseURI).href} sandbox={DEMO_SANDBOX} title={`${title || '代码演示'}运行窗口`} referrerPolicy="no-referrer" /> : <div className="code-demo-placeholder"><Code2 size={27} aria-hidden="true" /><span>{status === 'stopped' ? '演示已停止' : source.trim() ? '点击“运行演示”查看效果' : '添加 HTML 或 SVG 代码后即可运行'}</span></div>}
    </div>
    <div className="code-demo-status" role="status">{status === 'loading' ? '正在加载演示…' : status === 'running' ? '正在运行 · 独立演示窗口' : status === 'error' ? '运行遇到问题' : 'HTML / SVG · 点击后运行'}</div>
    {error && <p className="code-demo-error" role="alert">{error}</p>}
    {showSource && source && <details className="code-demo-source"><summary>查看源码</summary><CopyBlock text={source} language="html" /></details>}
  </section>;
}
