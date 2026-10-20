import { ArrowUpRight, BookOpenText, Swords } from 'lucide-react';
import { hasValhalla } from '../shared/valhalla.mjs';
import './valhalla.css';

export function RelatedKnowledge({ document, writing = false, valhalla = false }) {
  if (!hasValhalla(document)) return null;
  const Icon = valhalla ? BookOpenText : Swords;
  return <a className="related-knowledge" href={`#/${writing ? 'write/' : ''}${valhalla ? 'reference' : 'valhalla'}/${document.id}`}><Icon size={22} /><span><strong>{valhalla ? 'Reference' : 'Valhalla'}<span>{document.title}</span></strong><small>{valhalla ? '查看词条介绍与相关资料' : '查看模型更新评价与性能测试'}</small></span><ArrowUpRight size={18} /></a>;
}

export function ValhallaSync({ enabled, onChange }) {
  return <div className="valhalla-sync"><label><input type="checkbox" checked={enabled} onChange={event => onChange(event.target.checked)} /><span>同步到 Valhalla</span></label><p>用于记录模型更新评价与性能测试。发布后公开，取消勾选保留评测草稿。</p></div>;
}
