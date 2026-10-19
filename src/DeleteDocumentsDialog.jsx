import { useEffect, useRef, useState } from 'react';
import { FileText, Folder, Trash2, X } from 'lucide-react';
import { post } from './api';
import { directoryStamp } from '../shared/directory-order.mjs';
import { deletionSelection } from '../shared/document-selection.mjs';
import './document-actions.css';

export default function DeleteDocumentsDialog({ documents, ids, isOwner, onComplete, onClose, onReview }) {
  const dialog = useRef();
  const pendingReview = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requested, setRequested] = useState(false);
  const affected = deletionSelection(documents, ids);
  const published = affected.filter(item => item.publishedVersion).length;
  useEffect(() => { dialog.current.showModal(); }, []);
  async function submit() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (!pendingReview.current) {
        const review = await post('/api/reviews', { action: 'delete', ids, tree: directoryStamp(documents) });
        pendingReview.current = review.id;
        setRequested(true);
      }
      if (isOwner) await post(`/api/reviews/${pendingReview.current}/approve`);
      await onComplete(affected.map(item => item.id), isOwner);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} className="dialog delete-documents-dialog" aria-labelledby="delete-documents-title" aria-describedby="delete-documents-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id="delete-documents-title">{isOwner ? '删除文档' : '申请删除文档'}</h2><button className="icon-button" type="button" aria-label="关闭删除确认" disabled={busy} onClick={onClose}><X size={18} /></button></div>
    <p id="delete-documents-description">{isOwner ? '你是站主，确认即视为批准并执行删除。' : '提交后由站主审核，通过前所有内容保持不变。'}以下 {affected.length} 项内容将一并移除{affected.length > ids.length ? '，已包含所选目录的全部子文档' : ''}。</p>
    <ul className="delete-document-list" aria-label="将删除的全部内容">{affected.map(item => <li key={item.id}>{item.kind === 'folder' ? <Folder size={17} /> : <FileText size={17} />}<span>{item.title}</span><small>{item.publishedVersion ? '含公开版本' : '仅草稿'}</small></li>)}</ul>
    <p className="delete-document-summary">{published ? `${published} 项含公开版本，执行后也会从阅读站移除。` : '这些内容尚未发布。'}图片库素材不会随文档一起删除。已发布内容的 GitHub 历史与缓存仍可能保留。</p>
    {error && <p className="delete-document-error" role="alert">{error}{requested && ' 删除申请记录已保留，可到待审核查看状态；请勿重复创建。'}</p>}
    <div className="dialog-actions">{requested && error && <button type="button" disabled={busy} onClick={onReview}>查看待审核</button>}<button type="button" disabled={busy} onClick={onClose}>取消</button><button className="danger" type="button" disabled={busy || !affected.length || (requested && !!error)} onClick={submit}><Trash2 size={16} />{busy ? '正在处理…' : isOwner ? `确认删除 ${affected.length} 项` : '提交删除审核'}</button></div>
  </dialog>;
}
