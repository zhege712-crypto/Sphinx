import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Folder, GripVertical, RotateCcw, X } from 'lucide-react';
import { directoryDocuments, directorySiblings, directoryStamp } from '../shared/directory-order.mjs';
import './directory-order.css';

export default function DirectoryOrderDialog({ documents, initialParent = null, isOwner, busy, onSave, onClose }) {
  const dialog = useRef(); const dragged = useRef(); const dropTarget = useRef();
  const [snapshot] = useState(documents);
  const guides = directoryDocuments(snapshot);
  const [parentId, setParentId] = useState(guides.some(item => item.id === initialParent) ? initialParent : null);
  const [ids, setIds] = useState(() => directorySiblings(snapshot, guides.some(item => item.id === initialParent) ? initialParent : null).map(item => item.id));
  const [over, setOver] = useState(null); const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  const original = directorySiblings(snapshot, parentId).map(item => item.id);
  const changed = ids.some((id, index) => original[index] !== id);
  function choose(value) { const next = value || null; setParentId(next); setIds(directorySiblings(snapshot, next).map(item => item.id)); setError(''); }
  function move(from, to) {
    if (busy || from < 0 || to < 0 || from >= ids.length || to >= ids.length || from === to) return;
    const next = [...ids]; const [item] = next.splice(from, 1); next.splice(to, 0, item); setIds(next); setError('');
  }
  function startDrag(event, id) { if (busy) return; event.preventDefault(); dragged.current = id; dropTarget.current = id; event.currentTarget.setPointerCapture(event.pointerId); }
  function drag(event) {
    if (!dragged.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-order-id]');
    const id = target && dialog.current.contains(target) ? target.dataset.orderId : null;
    dropTarget.current = id; setOver(id);
  }
  function finishDrag(event, cancel = false) {
    if (!cancel && dragged.current && dropTarget.current) move(ids.indexOf(dragged.current), ids.indexOf(dropTarget.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragged.current = null; dropTarget.current = null; setOver(null);
  }
  function path(item) {
    const names = [item.title]; let current = item.parentId; const seen = new Set([item.id]);
    while (current && !seen.has(current)) { seen.add(current); const parent = guides.find(row => row.id === current); if (!parent) break; names.unshift(parent.title); current = parent.parentId; }
    return names.join(' / ');
  }
  async function submit(event) { event.preventDefault(); setError(''); try { await onSave({ ids, parentId, tree: directoryStamp(snapshot) }); } catch (e) { setError(e.message); } }
  return <dialog ref={dialog} className="dialog directory-order-dialog" aria-labelledby="directory-order-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id="directory-order-title">目录排序</h2><button className="icon-button" type="button" aria-label="关闭目录排序" disabled={busy} onClick={onClose}><X size={18} /></button></div>
    <p>拖动左侧手柄，或使用上下箭头调整顺序。{isOwner ? '保存后同步到公开目录，未发布的内容仍保留为草稿。' : '提交后由站主审核，审核前保留原顺序。'}</p>
    <form onSubmit={submit}>
      <label>选择目录<select aria-label="选择排序目录" value={parentId || ''} disabled={busy || changed} onChange={event => choose(event.target.value)}><option value="">顶层目录</option>{[...guides].sort((a, b) => path(a).localeCompare(path(b), 'zh-CN')).map(item => <option key={item.id} value={item.id}>{path(item)}</option>)}</select></label>
      {changed && <p className="directory-order-hint">保存或重置本次调整后，可切换其他目录。</p>}
      <ol className="directory-order-list" aria-label="目录顺序">{ids.map((id, index) => {
        const item = guides.find(row => row.id === id); const Icon = item.kind === 'folder' ? Folder : FileText;
        return <li key={id} data-order-id={id} className={over === id ? 'drag-over' : ''}>
          <button type="button" className="directory-drag-handle" aria-label={`拖动 ${item.title} 排序`} disabled={busy} onPointerDown={event => startDrag(event, id)} onPointerMove={drag} onPointerUp={event => finishDrag(event)} onPointerCancel={event => finishDrag(event, true)} onKeyDown={event => { if (['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); move(index, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}><GripVertical size={16} aria-hidden="true" /></button><span className="directory-order-number">{index + 1}</span><Icon size={17} aria-hidden="true" /><span className="directory-order-name" title={item.title}>{item.title}</span><div className="directory-order-arrows"><button type="button" className="icon-button" aria-label={`上移 ${item.title}`} disabled={busy || index === 0} onClick={() => move(index, index - 1)}><ArrowUp size={16} /></button><button type="button" className="icon-button" aria-label={`下移 ${item.title}`} disabled={busy || index === ids.length - 1} onClick={() => move(index, index + 1)}><ArrowDown size={16} /></button></div>
        </li>;
      })}</ol>
      {ids.length < 2 && <p className="directory-order-empty">此目录少于两项内容，暂时无需排序。</p>}
      <p className="directory-order-hint">“参与者与致谢”继续固定在目录末尾。Reference 按字母索引排列。</p>
      {error && <p className="directory-order-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" className="directory-order-reset" disabled={busy || !changed} onClick={() => { setIds(original); setError(''); }}><RotateCcw size={15} />重置</button><button type="button" disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy || !changed || ids.length > 100}>{busy ? '正在保存…' : isOwner ? '保存并应用顺序' : '提交排序审核'}</button></div>
      {ids.length > 100 && <p className="directory-order-error">单个目录最多支持 100 项排序，请先拆分目录。</p>}
    </form>
  </dialog>;
}
