import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { readerHiddenSource } from '../shared/reader-visibility.mjs';
import './reader-visibility.css';

export function ReaderVisibilityNotice({ document, documents, isOwner, busy, onChange, onOpen }) {
  const source = readerHiddenSource(document, documents);
  if (!source) return null;
  const inherited = source.id !== document.id;
  return <div className="reader-visibility-notice" role="status">
    <EyeOff size={18} />
    <div><strong>{inherited ? '随上级目录从读者界面隐藏' : '已从读者界面隐藏'}</strong>
      <p>{inherited ? `上级目录“${source.title}”已隐藏，恢复该目录后才能公开显示。` : '后台仍可访问和编辑。发布修改不会自动恢复显示。'}</p></div>
    {isOwner && <button type="button" disabled={busy} onClick={() => inherited ? onOpen(source.id) : onChange(document)}>{inherited ? '打开上级目录' : '恢复读者显示'}</button>}
  </div>;
}

export default function ReaderVisibilityDialog({ document, onSave, onClose }) {
  const dialog = useRef();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hidden = !document.readerHidden;
  const label = hidden ? '在读者界面隐藏' : '恢复读者显示';
  useEffect(() => { dialog.current.showModal(); }, []);
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try { await onSave(document, hidden); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="dialog reader-visibility-dialog" aria-labelledby="reader-visibility-title" aria-describedby="reader-visibility-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id="reader-visibility-title">{label}</h2><button className="icon-button" aria-label="关闭可见性设置" disabled={busy} onClick={onClose}><X size={18} /></button></div>
    <p className="reader-visibility-target">{document.title}</p>
    <p id="reader-visibility-description">{hidden ? '读者将无法在目录、搜索或原链接中打开这项内容。后台的正文、草稿与历史版本保留，可随时恢复显示。' : '恢复上一次已发布的内容，未发布的修改仍保留为草稿。尚未发布的文档仍需点击发布后才能公开。'}</p>
    {document.kind !== 'reference' && <p className="reader-visibility-detail">{hidden ? '如果包含子文档，它们也会一起隐藏。' : '子文档随上级目录恢复；单独隐藏的子文档继续隐藏。上级目录仍隐藏时，本项仍不会公开显示。'}</p>}
    <p className="reader-visibility-detail">公开阅读站将在构建完成后更新。此操作用于控制当前阅读展示，不会清除已发布内容的历史文件或缓存。</p>
    {error && <p className="reader-visibility-error" role="alert">{error}若提示发布结果待确认，请先到“发布与操作记录”恢复状态，再重新打开此窗口。</p>}
    <div className="dialog-actions"><button disabled={busy} onClick={onClose}>取消</button><button className="primary" disabled={busy} onClick={save}>{hidden ? <EyeOff size={16} /> : <Eye size={16} />}{busy ? '正在更新…' : label}</button></div>
  </dialog>;
}
