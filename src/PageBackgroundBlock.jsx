import { useEffect, useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { X, Upload, Image, Trash2 } from 'lucide-react';
import { api } from './api';
import PageBackground from './PageBackground';
import { backgroundDefaults, backgroundProps, pageBackground } from '../shared/page-background.mjs';
import './page-background.css';

export const pageBackgroundBlock = createReactBlockSpec({ type: 'pageBackground', content: 'none', propSchema: { url: { default: '' }, name: { default: '' }, preset: { default: 'none', values: ['none', 'windows'] }, blur: { default: 0 }, opacity: { default: 25 }, positionX: { default: 50 }, positionY: { default: 50 }, enabled: { default: true } } }, { render: () => <span aria-hidden="true" /> })();
const imagesIn = blocks => blocks.flatMap(block => [...(['image', 'imageText'].includes(block.type) && block.props?.url ? [{ url: block.props.url, name: block.props.name || block.props.caption || '文章图片' }] : []), ...imagesIn(block.children || [])]);

export function BackgroundEditorBridge({ editor, documentId, title, kind, blocks, upload }) {
  const [open, setOpen] = useState(false);
  const current = { id: documentId, title, kind, blocks };
  function update(props) {
    const old = editor.document.find(block => block.type === 'pageBackground');
    const clean = backgroundProps({ ...(pageBackground({ ...current, blocks: editor.document }) || backgroundDefaults), ...props });
    if (old) editor.updateBlock(old, { props: clean });
    else editor.insertBlocks([{ type: 'pageBackground', props: clean }], editor.document[0], 'before');
  }
  useEffect(() => {
    const show = () => setOpen(true);
    const useImage = event => { try { update({ url: event.detail.url, name: event.detail.name, preset: 'none', enabled: true }); setOpen(true); } catch {} };
    window.addEventListener('sphinx:open-background', show); window.addEventListener('sphinx:set-background', useImage);
    return () => { window.removeEventListener('sphinx:open-background', show); window.removeEventListener('sphinx:set-background', useImage); };
  }, [editor, documentId, title, kind]);
  return <><PageBackground key={documentId} document={current} privatePreview />{open && <BackgroundSettings editor={editor} settings={pageBackground(current) || backgroundDefaults} onChange={update} upload={upload} onClose={() => setOpen(false)} />}</>;
}
function BackgroundSettings({ editor, settings, onChange, onClose, upload }) {
  const dialog = useRef(); const input = useRef();
  const [library, setLibrary] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [uploading, setUploading] = useState(false);
  useEffect(() => { dialog.current.showModal(); let alive = true; api('/api/assets').then(result => { if (alive) setLibrary(result.assets.map(asset => ({ url: `/api/assets/${asset.id}`, name: '图片库素材' }))); }).catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const images = [...new Map([...imagesIn(editor.document), ...library].map(image => [image.url, image])).values()];
  return <dialog className="dialog background-dialog" ref={dialog} onCancel={event => { event.preventDefault(); if (!uploading) onClose(); }} aria-labelledby="background-title">
    <div className="dialog-heading"><h2 id="background-title">本页背景</h2><button type="button" className="icon-button" aria-label="关闭背景设置" disabled={uploading} onClick={onClose}><X size={18} /></button></div>
    <p className="section-description">仅用于当前文章或词条。随草稿保存，发布后读者可见；读者可以自行关闭。</p>
    <div className="background-actions"><button type="button" disabled={uploading} onClick={() => input.current.click()}><Upload size={16} />{uploading ? '正在上传…' : '上传背景'}</button><button type="button" disabled={uploading} aria-pressed={settings.preset === 'windows' && !settings.url} onClick={() => onChange({ url: '', preset: 'windows', enabled: true })}><Image size={16} />Windows · 蓝天白云</button><button type="button" disabled={uploading} onClick={() => onChange({ enabled: false })}><Trash2 size={16} />移除背景</button></div>
    <input hidden ref={input} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(''); try { const url = await upload(file); onChange({ url, name: file.name, preset: 'none', enabled: true }); } catch (e) { setError(e.message); } finally { setUploading(false); event.target.value = ''; } }} />
    <div className="background-sliders">{[['blur', '模糊', 30, 'px'], ['opacity', '不透明度', 100, '%'], ['positionX', '水平位置', 100, '%'], ['positionY', '垂直位置', 100, '%']].map(([key, label, max, unit]) => <label key={key}><span>{label}<output>{settings[key]}{unit}</output></span><input type="range" disabled={uploading} aria-label={`背景${label}`} min="0" max={max} value={settings[key]} onChange={event => onChange({ [key]: Number(event.target.value) })} /></label>)}</div>
    <h3>使用已有图片</h3>{loading && <p className="muted" role="status">正在加载图片库…</p>}{!loading && !images.length && <p className="muted">暂无图片。上传背景，或在正文图片旁点击“设为背景”。</p>}
    <div className="background-image-list">{images.map(image => <button type="button" disabled={uploading} key={image.url} aria-label={`设为背景：${image.name}`} aria-pressed={settings.url === image.url && settings.enabled} onClick={() => onChange({ ...image, preset: 'none', enabled: true })}><img src={image.url} alt={image.name} loading="lazy" /></button>)}</div>
    {error && <p role="alert" className="term-link-error">{error}<button type="button" onClick={() => { setLoading(true); api('/api/assets').then(r => { setLibrary(r.assets.map(a => ({ url: `/api/assets/${a.id}`, name: '图片库素材' }))); setError(''); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}>重试加载图片库</button></p>}
    <div className="dialog-actions"><small>背景调整会自动保存到草稿</small><button type="button" className="primary" disabled={uploading} onClick={onClose}>完成</button></div>
  </dialog>;
}
