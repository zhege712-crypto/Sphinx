import { useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { Upload } from 'lucide-react';
import { DEMO_HEIGHTS, DEMO_SOURCE_LIMIT } from '../shared/code-demo.mjs';
import CodeDemo from './CodeDemo';

function EditableDemo({ block, editor }) {
  const input = useRef();
  const importVersion = useRef(0);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const update = props => editor.updateBlock(block, { props });
  async function importFile(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    const version = ++importVersion.current;
    setError(''); setImporting(true);
    try {
      if (!/\.(html?|svg)$/i.test(file.name)) throw new Error('请选择单个 .html、.htm 或 .svg 文件');
      if (file.size > DEMO_SOURCE_LIMIT) throw new Error('文件最多 100 KB，请精简代码；图片可使用内嵌的小型 data URL');
      const source = await file.text();
      if (source.includes('\u0000')) throw new Error('文件应为 UTF-8 文本，请转换编码后重新导入');
      if (version !== importVersion.current) return;
      update({ source, ...(!block.props.title ? { title: file.name.replace(/\.(html?|svg)$/i, '') } : {}) });
    } catch (e) { if (version === importVersion.current) setError(e.message); }
    finally { if (version === importVersion.current) setImporting(false); }
  }
  return <div className="code-demo-editor" contentEditable={false}>
    <div className="code-demo-fields"><label>演示名称<input aria-label="代码演示名称" value={block.props.title} maxLength={160} placeholder="例如：鹈鹕骑车" onChange={e => update({ title: e.target.value })} /></label><label>窗口高度<select aria-label="代码演示窗口高度" value={block.props.height} onChange={e => update({ height: Number(e.target.value) })}>{DEMO_HEIGHTS.map(height => <option key={height} value={height}>{height} px</option>)}</select></label><button type="button" disabled={importing} onClick={() => input.current.click()}><Upload size={15} />{importing ? '正在导入…' : '导入 HTML / SVG'}</button><input ref={input} type="file" accept=".html,.htm,.svg" hidden onChange={importFile} /></div>
    <label className="code-demo-source-label">演示代码<textarea aria-label="演示代码" value={block.props.source} maxLength={DEMO_SOURCE_LIMIT} spellCheck={false} autoCapitalize="none" placeholder={'粘贴完整 HTML，或 SVG 代码。CSS 和 JavaScript 请包含在同一文件内。'} onChange={e => { importVersion.current++; setImporting(false); setError(''); update({ source: e.target.value }); }} /></label>
    <p className="code-demo-hint">支持单文件 HTML、SVG，以及内嵌 CSS / JavaScript。外部脚本、图片和网络请求不可用；修改后需重新运行。</p>
    {error && <p className="code-demo-error" role="alert">{error}</p>}
    <CodeDemo {...block.props} showSource={false} />
  </div>;
}

export const codeDemoBlock = createReactBlockSpec({ type: 'codeDemo', propSchema: { title: { default: '' }, source: { default: '' }, height: { default: 400 } }, content: 'none' }, { render: props => <EditableDemo {...props} /> })();
