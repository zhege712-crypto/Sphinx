import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, ImagePlus, Table2, Download, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import '@blocknote/mantine/style.css';
import { api, post, downloadJson } from './api';
import { Outline, Reader } from './Reader';
import References from './References';
const { audio, video, file, ...supported } = defaultBlockSpecs;
const schema = BlockNoteSchema.create({ blockSpecs: supported });
const Tool = ({ label, icon: Icon, onClick }) => <button type="button" className="icon-button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}><Icon size={18} /></button>;

export default forwardRef(function Editor({ document: initial, user, onSaved, onStatus, preview, toast }, ref) {
  const recoveryKey = `guide-recovery:${user.id}:${initial.id}`;
  const [recovery, setRecovery] = useState(() => { try { return JSON.parse(sessionStorage.getItem(recoveryKey)); } catch { return null; } });
  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const state = useRef({ title: initial.title, blocks: initial.blocks, version: initial.version, generation: 0, saved: 0, failed: false });
  const pending = useRef(null); const timer = useRef(); const fileInput = useRef(); const alive = useRef(true);
  const uploads = useRef(new Set());
  async function upload(file) {
    let complete;
    const settled = new Promise((resolve) => { complete = resolve; });
    uploads.current.add(settled); setUploadCount(uploads.current.size);
    try { return (await api('/api/assets', { method: 'POST', body: file })).url; }
    catch (e) { toast(e.message, true); throw e; }
    finally {
      // Let the editor insert the returned URL before a navigation flush can finish.
      setTimeout(() => { uploads.current.delete(settled); if (alive.current) setUploadCount(uploads.current.size); complete(); }, 0);
    }
  }
  const editor = useCreateBlockNote({ schema, initialContent: initial.blocks, dictionary: zh, tables: { splitCells: false }, uploadFile: upload });
  async function flush() {
    clearTimeout(timer.current);
    if (uploads.current.size) { await Promise.all([...uploads.current]); return flush(); }
    if (pending.current) { await pending.current; if (state.current.generation !== state.current.saved) return flush(); return state.current; }
    if (state.current.failed) throw new Error(error || '请先处理保存错误，再继续');
    if (state.current.generation === state.current.saved) return state.current;
    const snapshot = { ...state.current };
    setSaving(true); onStatus('saving');
    const task = (async () => {
      try {
        const { document: saved } = await api(`/api/documents/${initial.id}`, { method: 'PUT', body: JSON.stringify({ title: snapshot.title, blocks: snapshot.blocks, version: snapshot.version }) });
        state.current.version = saved.version; state.current.saved = snapshot.generation;
        if (alive.current) { onSaved(saved); setError(''); setDirty(state.current.generation !== snapshot.generation); onStatus(state.current.generation === snapshot.generation ? 'saved' : 'dirty'); }
        if (state.current.generation === snapshot.generation) sessionStorage.removeItem(recoveryKey);
        return state.current;
      } catch (e) { state.current.failed = true; if (alive.current) { setError(e.message); onStatus('error'); } throw e; }
      finally { pending.current = null; if (alive.current) setSaving(false); }
    })(); pending.current = task; return task;
  }
  function changed(nextTitle, nextBlocks) {
    const s = state.current; s.title = nextTitle; s.blocks = nextBlocks; s.generation++;
    setDirty(true); onStatus('dirty'); setBlocks(nextBlocks);
    try { sessionStorage.setItem(recoveryKey, JSON.stringify({ title: nextTitle, blocks: nextBlocks, version: s.version })); } catch { /* Server save still works if browser storage is unavailable. */ }
    clearTimeout(timer.current); if (!s.failed) timer.current = setTimeout(() => flush().catch(() => {}), 1000);
  }
  useImperativeHandle(ref, () => ({ flush, snapshot: () => state.current, publish: async () => { const s = await flush(); const result = await post(`/api/documents/${initial.id}/publish`, { version: s.version }); return result; } }));
  useEffect(() => { const prevent = (e) => { if (state.current.generation !== state.current.saved || uploads.current.size) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', prevent); return () => { alive.current = false; clearTimeout(timer.current); window.removeEventListener('beforeunload', prevent); }; }, []);
  const blockType = (type, props = {}) => { const current = editor.getTextCursorPosition().block; editor.updateBlock(current, { type, props }); editor.focus(); };
  const addTable = () => { editor.insertBlocks([{ type: 'table', content: { type: 'tableContent', headerRows: 1, rows: [{ cells: ['列一', '列二', '列三'] }, { cells: ['', '', ''] }, { cells: ['', '', ''] }] } }], editor.getTextCursorPosition().block, 'after'); editor.focus(); };
  return <div className="document-layout">
    <section className="document-column">
      {!preview && <div className="editor-toolbar" role="toolbar" aria-label="文字排版">
        <Tool label="撤销" icon={Undo2} onClick={() => editor.undo()} /><Tool label="重做" icon={Redo2} onClick={() => editor.redo()} /><span className="toolbar-divider" />
        <button className="text-tool" onClick={() => blockType('paragraph')}>正文</button><span className="toolbar-divider" />
        <Tool label="加粗" icon={Bold} onClick={() => editor.toggleStyles({ bold: true })} /><Tool label="斜体" icon={Italic} onClick={() => editor.toggleStyles({ italic: true })} /><Tool label="下划线" icon={Underline} onClick={() => editor.toggleStyles({ underline: true })} /><Tool label="删除线" icon={Strikethrough} onClick={() => editor.toggleStyles({ strike: true })} /><span className="toolbar-divider" />
        <Tool label="一级标题" icon={Heading1} onClick={() => blockType('heading', { level: 1 })} /><Tool label="二级标题" icon={Heading2} onClick={() => blockType('heading', { level: 2 })} /><Tool label="三级标题" icon={Heading3} onClick={() => blockType('heading', { level: 3 })} /><span className="toolbar-divider" />
        <Tool label="无序列表" icon={List} onClick={() => blockType('bulletListItem')} /><Tool label="有序列表" icon={ListOrdered} onClick={() => blockType('numberedListItem')} /><Tool label="待办列表" icon={ListTodo} onClick={() => blockType('checkListItem')} /><span className="toolbar-divider" />
        <Tool label="插入图片" icon={ImagePlus} onClick={() => fileInput.current.click()} /><Tool label="插入表格" icon={Table2} onClick={addTable} />
        <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp" onChange={async (e) => { const input = e.target; const file = input.files?.[0]; if (!file) return; try { const url = await upload(file); editor.insertBlocks([{ type: 'image', props: { url, name: file.name } }], editor.getTextCursorPosition().block, 'after'); } catch { /* Upload reports its own actionable error. */ } input.value = ''; }} />
      </div>}
      {uploadCount > 0 && <div className="upload-progress" role="status"><Loader2 size={14} className="spin" />正在上传 {uploadCount} 张图片，完成后自动保存…</div>}
      {error && <div className="save-error" role="alert"><strong>草稿尚未保存</strong><p>{error}</p><div className="button-row"><button onClick={() => { state.current.failed = false; setError(''); flush().catch(() => {}); }}><RotateCcw size={15} />重新尝试</button><button onClick={() => downloadJson(`${title || '文档'}-未保存.json`, state.current)}><Download size={15} />下载当前内容</button><button onClick={() => { if (confirm('重新加载会离开当前编辑内容。请先下载副本，确定继续吗？')) { sessionStorage.removeItem(recoveryKey); location.reload(); } }}>加载最新版本</button></div></div>}
      {recovery && <div className="recovery-banner"><p>此浏览器保留了尚未保存的编辑内容。</p><div className="button-row"><button onClick={() => { editor.replaceBlocks(editor.document, recovery.blocks); setTitle(recovery.title); changed(recovery.title, editor.document); setRecovery(null); }}>恢复内容到草稿</button><button onClick={() => downloadJson('未保存的内容.json', recovery)}>下载副本</button><button onClick={() => { sessionStorage.removeItem(recoveryKey); setRecovery(null); }}>丢弃副本</button></div></div>}
      <div className="document-paper">
        {preview ? <><div className="preview-label">草稿预览 · 仅受邀伙伴可见</div><h1 className="document-title">{title}</h1><Reader blocks={blocks} privatePreview /></> : <>
          <input className="title-input" aria-label="文档标题" value={title} maxLength={160} placeholder="未命名文档" onChange={(e) => { setTitle(e.target.value); changed(e.target.value, editor.document); }} />
          <div className="document-byline">{initial.kind === 'folder' ? '目录说明' : '共享草稿'}<span>·</span>输入 / 插入内容，选中文字设置格式</div>
          <BlockNoteView editor={editor} theme="light" onChange={() => changed(state.current.title, editor.document)} />
        </>}
      </div>
      <References />
      <div className="document-footer">{saving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}<span>{saving ? '正在保存…' : dirty ? '等待保存' : '草稿已保存'} · {user.login}</span></div>
    </section>
    <Outline blocks={blocks} editing={!preview} />
  </div>;
});
