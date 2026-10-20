import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { zh } from '@blocknote/core/locales';
import { createReactBlockSpec, FormattingToolbarController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Undo2, Redo2, Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, ImagePlus, Table2, Download, RotateCcw, CheckCircle2, Loader2, Link2, Link, Columns2, ArrowLeft, Copy } from 'lucide-react';
import '@blocknote/mantine/style.css';
import { api, post, downloadJson } from './api';
import { Outline, Reader } from './Reader';
import References, { BuildCredits } from './References';
import { WebsiteCard, websiteUrl } from './WebsiteCard';
import { imageBlock, imageTextBlock } from './ImageBlocks';
import { codeDemoBlock } from './CodeDemoBlock';
import { pageBackgroundBlock, BackgroundEditorBridge } from './PageBackgroundBlock';
import AuthorPicker from './AuthorPicker';
import { Code2 } from 'lucide-react';
import SiteNotice from './SiteNotice';
import TermLinkDialog from './TermLinkDialog';
import QuickTermToolbar from './QuickTermLink';
import { referenceHref } from '../shared/reference-links.mjs';
import { TagEditor, TagList } from './Tags';
import useScrollMemory from './useScrollMemory';
import { readValhalla, recoverKnowledgeSection } from '../shared/valhalla.mjs';
import { RelatedKnowledge, ValhallaSync } from './Valhalla';
const { audio, video, file, ...supported } = defaultBlockSpecs;
function EditableWebsiteCard({ block, editor }) {
  const [url, setUrl] = useState(block.props.url);
  useEffect(() => setUrl(block.props.url), [block.props.url]);
  return <div className="website-card-editor" contentEditable={false}>
    <div className="website-card-fields"><label>卡片名称<input aria-label="网站卡片名称" value={block.props.title} maxLength={160} placeholder="网站或资料名称" onChange={event => editor.updateBlock(block, { props: { title: event.target.value } })} /></label><label>网址<input aria-label="网站卡片网址" value={url} maxLength={2048} placeholder="https://" aria-invalid={!!url && !websiteUrl(url)} onChange={event => { const next = event.target.value; setUrl(next); if (!next || websiteUrl(next)) editor.updateBlock(block, { props: { url: next } }); }} /></label></div>
    {url && !websiteUrl(url) ? <p className="link-card-error" role="status">网址尚未保存，请输入完整的 http 或 https 网址。</p> : <WebsiteCard title={block.props.title} url={block.props.url} />}
  </div>;
}
const linkCard = createReactBlockSpec({ type: 'linkCard', propSchema: { title: { default: '' }, url: { default: '' } }, content: 'none' }, {
  render: props => <EditableWebsiteCard {...props} />,
})();
const schema = BlockNoteSchema.create({ blockSpecs: { ...supported, image: imageBlock, imageText: imageTextBlock, linkCard, codeDemo: codeDemoBlock, pageBackground: pageBackgroundBlock } });
const Tool = ({ label, icon: Icon, onClick }) => <button type="button" className="icon-button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}><Icon size={18} /></button>;

export default forwardRef(function Editor({ document: initial, user, onSaved, onStatus, preview, toast, referenceEntries, onReferenceOpen, onBackReference, onBack, backLabel, section }, ref) {
  const valhallaMode = section === 'valhalla';
  const initialValhalla = readValhalla(initial.valhalla);
  const initialBlocks = valhallaMode ? initialValhalla.blocks : initial.blocks;
  const column = useRef(); useScrollMemory(`writer:${initial.id}${valhallaMode ? ':valhalla' : ''}`, column);
  const recoveryKey = `guide-recovery:${user.id}:${initial.id}${valhallaMode ? ':valhalla' : ''}`;
  const [recovery, setRecovery] = useState(() => { try { return JSON.parse(sessionStorage.getItem(recoveryKey)); } catch { return null; } });
  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState(initialBlocks);
  const [valhalla, setValhalla] = useState(initialValhalla);
  const [tags, setTags] = useState(initial.tags || []);
  const tagEditorRef = useRef(); const tagDraft = useRef('');
  const authorPickerRef = useRef();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [linkTarget, setLinkTarget] = useState(null);
  const state = useRef({ title: initial.title, blocks: initialBlocks, referenceBlocks: initial.blocks, valhalla: initialValhalla, tags: initial.tags || [], version: initial.version, generation: 0, saved: 0, failed: false });
  const pending = useRef(null); const timer = useRef(); const fileInput = useRef(); const alive = useRef(true);
  const imageInsertMode = useRef('image');
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
  const editor = useCreateBlockNote({ schema, initialContent: initialBlocks.length ? initialBlocks : [{ type: 'paragraph', content: [] }], dictionary: zh, tables: { splitCells: false }, uploadFile: upload });
  function openTermLink() {
    const { selection, doc } = editor.prosemirrorState;
    const existing = selection.empty ? editor.getLinkMarkAtPos(selection.from) : null;
    const text = existing?.text || editor.getSelectedText();
    if (!text.trim() || !selection.$from.parent.inlineContent || selection.$from.parent !== selection.$to.parent) { toast('请先选中一段词汇，再点击“词汇链接”', true); return; }
    setLinkTarget({ selection, doc, text, href: existing?.href || editor.getSelectedLinkUrl() || '', position: existing ? selection.from : null });
  }
  function quickAssociate(entry, target) {
    const { selection, doc } = editor.prosemirrorState;
    if (selection.empty || doc !== target.doc || selection.from !== target.from || selection.to !== target.to || editor.getSelectedText() !== target.text || !selection.$from.parent.inlineContent || selection.$from.parent !== selection.$to.parent) { toast('选中文字已变化，请重新选择词汇后关联', true); return; }
    // A named button is the author's explicit choice; nothing is linked automatically.
    editor.createLink(referenceHref(entry.id));
    editor.focus(); toast(`已关联 Reference：${entry.title}`);
  }
  function restoreLinkSelection() {
    // Dialog focus protects the range. Refuse a stale range if an asynchronous upload changed the document.
    if (editor.prosemirrorState.doc !== linkTarget.doc) throw new Error('正文已变化，请取消后重新选中文字再添加链接');
    editor.transact(tr => tr.setSelection(linkTarget.selection));
  }
  function closeTermLink() { if (editor.prosemirrorState.doc === linkTarget.doc) editor.transact(tr => tr.setSelection(linkTarget.selection)); setLinkTarget(null); editor.focus(); }
  function applyTermLink(href) {
    restoreLinkSelection();
    if (linkTarget.position !== null) editor.editLink(href, linkTarget.text, linkTarget.position);
    else editor.createLink(href);
    setLinkTarget(null); editor.focus();
  }
  function removeTermLink() {
    restoreLinkSelection();
    if (linkTarget.position !== null) editor.deleteLink(linkTarget.position);
    else editor.transact(tr => tr.removeMark(linkTarget.selection.from, linkTarget.selection.to, editor.pmSchema.marks.link));
    setLinkTarget(null); editor.focus();
  }
  async function flush() {
    await authorPickerRef.current?.flush();
    tagEditorRef.current?.commit();
    clearTimeout(timer.current);
    if (document.querySelector('.website-card-editor input[aria-invalid="true"]')) throw new Error('请先修正网站卡片中尚未保存的网址');
    if (document.querySelector('.image-width-input[aria-invalid="true"]')) throw new Error('图片宽度应为 64–1600 像素');
    if (uploads.current.size) { await Promise.all([...uploads.current]); return flush(); }
    if (pending.current) { await pending.current; if (state.current.generation !== state.current.saved) return flush(); return state.current; }
    if (state.current.failed) throw new Error(error || '请先处理保存错误，再继续');
    if (state.current.generation === state.current.saved) return state.current;
    const snapshot = { ...state.current };
    setSaving(true); onStatus('saving');
    const task = (async () => {
      try {
        const { document: saved } = await api(`/api/documents/${initial.id}`, { method: 'PUT', body: JSON.stringify({ title: snapshot.title, blocks: valhallaMode ? snapshot.referenceBlocks : snapshot.blocks, valhalla: valhallaMode ? { ...snapshot.valhalla, blocks: snapshot.blocks } : snapshot.valhalla, tags: snapshot.tags, version: snapshot.version }) });
        state.current.version = saved.version; state.current.saved = snapshot.generation;
        if (alive.current) { onSaved(saved); setError(''); const unsaved = state.current.generation !== snapshot.generation || !!tagDraft.current.trim(); setDirty(unsaved); onStatus(unsaved ? 'dirty' : 'saved'); }
        if (state.current.generation === snapshot.generation && !tagDraft.current) sessionStorage.removeItem(recoveryKey);
        return state.current;
      } catch (e) { state.current.failed = true; if (alive.current) { setError(e.message); onStatus('error'); } throw e; }
      finally { pending.current = null; if (alive.current) setSaving(false); }
    })(); pending.current = task; return task;
  }
  function changed(nextTitle, nextBlocks) {
    const s = state.current; s.title = nextTitle; s.blocks = nextBlocks; s.generation++;
    setDirty(true); onStatus('dirty'); setBlocks(nextBlocks);
    try { sessionStorage.setItem(recoveryKey, JSON.stringify({ title: nextTitle, blocks: nextBlocks, referenceBlocks: s.referenceBlocks, valhalla: s.valhalla, tags: s.tags, tagDraft: tagDraft.current, version: s.version })); } catch { /* Server save still works if browser storage is unavailable. */ }
    clearTimeout(timer.current); if (!s.failed) timer.current = setTimeout(() => flush().catch(() => {}), 1000);
  }
  useImperativeHandle(ref, () => ({ flush, snapshot: () => state.current, publish: async () => { const s = await flush(); const result = await post(`/api/documents/${initial.id}/publish`, { version: s.version }); return result; } }));
  useEffect(() => { const prevent = (e) => { if (tagDraft.current.trim() || state.current.generation !== state.current.saved || uploads.current.size || document.querySelector('.website-card-editor input[aria-invalid="true"], .image-width-input[aria-invalid="true"]')) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', prevent); return () => { alive.current = false; clearTimeout(timer.current); window.removeEventListener('beforeunload', prevent); }; }, []);
  const blockType = (type, props = {}) => { const current = editor.getTextCursorPosition().block; editor.updateBlock(current, { type, props }); editor.focus(); };
  const addTable = () => { editor.insertBlocks([{ type: 'table', content: { type: 'tableContent', headerRows: 1, rows: [{ cells: ['列一', '列二', '列三'] }, { cells: ['', '', ''] }, { cells: ['', '', ''] }] } }], editor.getTextCursorPosition().block, 'after'); editor.focus(); };
  return <div className="document-layout">
    <section ref={column} className="document-column">
      {!preview && <div className="editor-toolbar" role="toolbar" aria-label="文字排版"><div className="editor-format-tools">
        <Tool label="撤销" icon={Undo2} onClick={() => editor.undo()} /><Tool label="重做" icon={Redo2} onClick={() => editor.redo()} /><span className="toolbar-divider" />
        <button className="text-tool" onClick={() => blockType('paragraph')}>正文</button><span className="toolbar-divider" />
        <Tool label="加粗" icon={Bold} onClick={() => editor.toggleStyles({ bold: true })} /><Tool label="斜体" icon={Italic} onClick={() => editor.toggleStyles({ italic: true })} /><Tool label="下划线" icon={Underline} onClick={() => editor.toggleStyles({ underline: true })} /><Tool label="删除线" icon={Strikethrough} onClick={() => editor.toggleStyles({ strike: true })} /><span className="toolbar-divider" />
        <Tool label="一级标题" icon={Heading1} onClick={() => blockType('heading', { level: 1 })} /><Tool label="二级标题" icon={Heading2} onClick={() => blockType('heading', { level: 2 })} /><Tool label="三级标题" icon={Heading3} onClick={() => blockType('heading', { level: 3 })} /><span className="toolbar-divider" />
        <Tool label="无序列表" icon={List} onClick={() => blockType('bulletListItem')} /><Tool label="有序列表" icon={ListOrdered} onClick={() => blockType('numberedListItem')} /><Tool label="待办列表" icon={ListTodo} onClick={() => blockType('checkListItem')} /><span className="toolbar-divider" />
        </div><div className="editor-insert-tools"><span>插入</span>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { imageInsertMode.current = 'image'; fileInput.current.click(); }}><ImagePlus size={16} />图片</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { imageInsertMode.current = 'imageText'; fileInput.current.click(); }}><Columns2 size={16} />图文并排</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => window.dispatchEvent(new CustomEvent('sphinx:open-background'))}><ImagePlus size={16} />背景</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={addTable}><Table2 size={16} />表格</button>
        <button type="button" title="插入文本代码块，阅读时可一键复制" onMouseDown={e => e.preventDefault()} onClick={() => { const [block] = editor.insertBlocks([{ type: 'codeBlock', props: { language: 'text' }, content: '' }], editor.getTextCursorPosition().block, 'after'); editor.setTextCursorPosition(block, 'start'); editor.focus(); }}><Copy size={16} />可复制内容</button>
        <button type="button" title="导入 HTML / SVG，在独立窗口预览效果" onMouseDown={e => e.preventDefault()} onClick={() => { editor.insertBlocks([{ type: 'codeDemo', props: { title: '', source: '', height: 400 } }], editor.getTextCursorPosition().block, 'after'); }}><Code2 size={16} />代码演示</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={openTermLink}><Link size={16} />词汇链接</button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { editor.insertBlocks([{ type: 'linkCard', props: { title: '', url: '' } }], editor.getTextCursorPosition().block, 'after'); }}><Link2 size={16} />链接卡片</button>
        </div>
        <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp" onChange={async (e) => { const input = e.target; const file = input.files?.[0]; if (!file) return; try { const url = await upload(file); editor.insertBlocks([{ type: imageInsertMode.current, props: { url, name: file.name }, ...(imageInsertMode.current === 'imageText' ? { children: [{ type: 'paragraph', content: [] }] } : {}) }], editor.getTextCursorPosition().block, 'after'); } catch { /* Upload reports its own actionable error. */ } input.value = ''; }} />
      </div>}
      {uploadCount > 0 && <div className="upload-progress" role="status"><Loader2 size={14} className="spin" />正在上传 {uploadCount} 张图片，完成后自动保存…</div>}
      {error && <div className="save-error" role="alert"><strong>草稿尚未保存</strong><p>{error}</p><div className="button-row"><button onClick={() => { state.current.failed = false; setError(''); flush().catch(() => {}); }}><RotateCcw size={15} />重新尝试</button><button onClick={() => downloadJson(`${title || '文档'}-未保存.json`, state.current)}><Download size={15} />下载当前内容</button><button onClick={() => { if (confirm('重新加载会离开当前编辑内容。请先下载副本，确定继续吗？')) { sessionStorage.removeItem(recoveryKey); location.reload(); } }}>加载最新版本</button></div></div>}
      {recovery && <div className="recovery-banner"><p>此浏览器保留了尚未保存的编辑内容。</p>{recovery.version !== initial.version && <p>服务器版本已更新。恢复仅替换当前正文，保留最新名称、标签、同步设置和另一侧正文。</p>}<div className="button-row"><button onClick={() => { const restored = recoverKnowledgeSection(initial, recovery, section); editor.replaceBlocks(editor.document, restored.blocks); state.current.referenceBlocks = restored.referenceBlocks; state.current.valhalla = restored.valhalla; setValhalla(restored.valhalla); setTitle(restored.title); state.current.tags = restored.tags; setTags(restored.tags); tagEditorRef.current?.restore(restored.tagDraft); changed(restored.title, editor.document); setRecovery(null); }}>恢复内容到草稿</button><button onClick={() => downloadJson('未保存的内容.json', recovery)}>下载副本</button><button onClick={() => { sessionStorage.removeItem(recoveryKey); setRecovery(null); }}>丢弃副本</button></div></div>}
      <div className="document-paper">
        <button type="button" className="term-back editor-back" onClick={onBack}><ArrowLeft size={15} />{backLabel}</button>
        <RelatedKnowledge document={{ ...initial, title, valhalla }} writing valhalla={valhallaMode} />
        {preview ? <><div className="preview-label">草稿预览 · 仅受邀伙伴可见</div><h1 className="document-title">{title}</h1><TagList tags={tags} /><Reader blocks={blocks} privatePreview /></> : <>
          {valhallaMode ? <h1 className="document-title valhalla-editor-heading">{title}</h1> : <input className="title-input" aria-label={initial.kind === 'reference' ? '词条名称' : '文档标题'} value={title} maxLength={160} placeholder="未命名文档" onChange={(e) => { setTitle(e.target.value); changed(e.target.value, editor.document); }} />}
          <div className="document-byline">{valhallaMode ? 'Valhalla · 更新评价与性能测试' : initial.kind === 'reference' ? '词条正文' : initial.kind === 'folder' ? '目录说明' : '共享草稿'}<span>·</span>输入 / 插入内容，选中文字设置格式</div>
          {valhallaMode && <p className="valhalla-publish-note">名称与 Reference 同步，评测正文单独编辑。点击发布会同时公开两边已保存的内容。</p>}
          <AuthorPicker ref={authorPickerRef} documentId={initial.id} toast={toast} />
          {!valhallaMode && initial.kind === 'reference' && <ValhallaSync enabled={valhalla.enabled} onChange={enabled => { const next = { ...state.current.valhalla, enabled }; state.current.valhalla = next; setValhalla(next); changed(state.current.title, editor.document); }} />}
          {!valhallaMode && initial.kind === 'reference' && <TagEditor ref={tagEditorRef} tags={tags} entries={referenceEntries} onChange={next => { state.current.tags = next; setTags(next); changed(state.current.title, editor.document); }} onPending={value => { tagDraft.current = value; const unsaved = !!value.trim() || state.current.generation !== state.current.saved; setDirty(unsaved); onStatus(unsaved ? 'dirty' : 'saved'); try { if (unsaved) sessionStorage.setItem(recoveryKey, JSON.stringify({ title: state.current.title, blocks: state.current.blocks, referenceBlocks: state.current.referenceBlocks, valhalla: state.current.valhalla, tags: state.current.tags, tagDraft: value, version: state.current.version })); else sessionStorage.removeItem(recoveryKey); } catch {} }} />}
          <BlockNoteView editor={editor} theme="light" formattingToolbar={false} onChange={() => changed(state.current.title, editor.document)}>
            <FormattingToolbarController formattingToolbar={() => <QuickTermToolbar editor={editor} entries={referenceEntries} onOpen={openTermLink} onAssociate={quickAssociate} />} />
          </BlockNoteView>
        </>}
      </div>
      <BackgroundEditorBridge editor={editor} documentId={initial.id} title={title} kind={initial.kind} blocks={blocks} upload={upload} section={section} />
      {initial.kind === 'reference' ? <div className="term-editor-footer"><button onClick={onBackReference}>{valhallaMode ? '返回 Valhalla' : '返回词条索引'}</button><BuildCredits /></div> : <References entries={referenceEntries} onOpen={onReferenceOpen} compact />}
      <div className="document-footer">{saving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}<span>{saving ? '正在保存…' : dirty ? '等待保存' : '草稿已保存'} · {user.login}</span></div>
      <SiteNotice writing />
    </section>
    <Outline blocks={blocks} editing={!preview} />
    {linkTarget && <TermLinkDialog target={linkTarget} entries={referenceEntries} onApply={applyTermLink} onRemove={removeTermLink} onClose={closeTermLink} />}
  </div>;
});
