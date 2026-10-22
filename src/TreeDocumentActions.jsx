import { useId, useRef, useState } from 'react';
import { Folder, ListOrdered, MoreHorizontal, Trash2, Eye, EyeOff } from 'lucide-react';
import './document-actions.css';

export default function TreeDocumentActions({ document, busy, onSort, onMove, onDelete, onVisibility }) {
  const id = useId(); const menu = useRef();
  const [position, setPosition] = useState({ left: 8, top: 8 });
  function action(callback) { menu.current.hidePopover(); callback(document); }
  return <div className="tree-item-actions">
    <button className="icon-button" type="button" aria-label={`操作 ${document.title}`} title="文档操作" disabled={busy} popoverTarget={id} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ left: Math.max(8, Math.min(window.innerWidth - 206, rect.right - 190)), top: Math.max(8, Math.min(window.innerHeight - (onVisibility ? 210 : 168), rect.bottom + 4)) }); }}><MoreHorizontal size={16} /></button>
    <div ref={menu} id={id} popover="auto" className="menu-popover tree-document-menu" style={position} aria-label={`${document.title} 的操作`}>
      <button type="button" onClick={() => action(onSort)}><ListOrdered size={16} />调整顺序</button>
      <button type="button" onClick={() => action(onMove)}><Folder size={16} />调整所属目录</button>
      {onVisibility && <button type="button" onClick={() => action(onVisibility)}>{document.readerHidden ? <Eye size={16} /> : <EyeOff size={16} />}{document.readerHidden ? '恢复读者显示' : '在读者界面隐藏'}</button>}
      <button type="button" className="danger-text" onClick={() => action(onDelete)}><Trash2 size={16} />删除文档</button>
    </div>
  </div>;
}
