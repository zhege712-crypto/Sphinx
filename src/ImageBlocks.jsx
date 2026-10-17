import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { defaultBlockSpecs } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';
import { imageLayoutReplacement } from '../shared/image-layout.mjs';

const nativeImage = defaultBlockSpecs.image;

function ImageControls({ block, editor }) {
  const root = useRef();
  const [available, setAvailable] = useState(800);
  const [width, setWidth] = useState(String(block.props.previewWidth || ''));
  const beside = block.type === 'imageText';
  useEffect(() => setWidth(String(block.props.previewWidth || '')), [block.props.previewWidth]);
  useLayoutEffect(() => {
    const paper = root.current?.closest('.bn-editor');
    if (!paper) return;
    const observer = new ResizeObserver(() => setAvailable(Math.max(64, Math.floor(paper.clientWidth))));
    observer.observe(paper); return () => observer.disconnect();
  }, []);
  const update = props => editor.updateBlock(block, { props });
  const layout = beside ? block.props.side === 'right' ? 'text-left' : 'image-left' : block.props.textAlignment || 'left';
  function changeLayout(value) {
    const replacement = imageLayoutReplacement(editor.getBlock(block.id), value);
    editor.replaceBlocks([block.id], replacement);
  }
  return <div className="image-controls" ref={root} contentEditable={false} onMouseDown={e => e.stopPropagation()}>
    <div className="image-controls-row">
      <label>排版<select aria-label="图片排版" value={layout} onChange={e => changeLayout(e.target.value)}>
        <option value="left">单图 · 靠左</option><option value="center">单图 · 居中</option><option value="right">单图 · 靠右</option>
        <option value="image-left">图左文右</option><option value="text-left">文左图右</option>
      </select></label>
      {beside ? <label className="image-size-control">图片占宽<input aria-label="图片占宽" type="range" min="25" max="65" step="5" value={block.props.imageWidth} onChange={e => update({ imageWidth: Number(e.target.value) })} /><output>{block.props.imageWidth}%</output></label> : <>
        <label className="image-size-control">尺寸<input aria-label="图片宽度滑杆" type="range" min="64" max={Math.max(available, block.props.previewWidth || 0)} step="1" value={block.props.previewWidth || available} onChange={e => update({ previewWidth: Number(e.target.value) })} /></label>
        <label className="image-pixel-control"><input className="image-width-input" aria-label="图片宽度（像素）" type="number" min="64" max="1600" placeholder="自动" value={width} aria-invalid={!!width && (!Number.isFinite(Number(width)) || Number(width) < 64 || Number(width) > 1600)} onChange={e => { setWidth(e.target.value); const n = Number(e.target.value); if (n >= 64 && n <= 1600) update({ previewWidth: n }); }} onBlur={() => { if (!width) update({ previewWidth: undefined }); else { const n = Math.max(64, Math.min(1600, Number(width) || available)); setWidth(String(n)); update({ previewWidth: n }); } }} />px</label>
        <div className="image-presets" aria-label="图片尺寸预设">{[[.33, '小'], [.66, '中'], [1, '满宽']].map(([scale, label]) => <button type="button" key={label} onClick={() => update({ previewWidth: Math.max(64, Math.round(available * scale)) })}>{label}</button>)}</div>
      </>}
    </div>
    <label className="image-caption-control">图注<input aria-label="图片说明" maxLength={1000} placeholder="添加图片说明（选填）" value={block.props.caption} onChange={e => update({ caption: e.target.value })} /></label>
  </div>;
}

function EditableImage({ block, editor }) {
  const host = useRef();
  useEffect(() => {
    const rendered = nativeImage.implementation.render(block, editor);
    host.current.replaceChildren(rendered.dom);
    return () => rendered.destroy?.();
  }, [block, editor]);
  return <div className="image-editor" contentEditable={false}><div className="native-image-host" style={{ display: 'flex', justifyContent: ({ center: 'center', right: 'flex-end' })[block.props.textAlignment] || 'flex-start' }} ref={host} />{block.props.url && <ImageControls block={block} editor={editor} />}</div>;
}

export const imageBlock = createReactBlockSpec(nativeImage.config, {
  meta: nativeImage.implementation.meta,
  parse: nativeImage.implementation.parse,
  render: EditableImage,
  toExternalHTML: ({ block }) => <figure><img src={block.props.url} alt={block.props.name} width={block.props.previewWidth} /><figcaption>{block.props.caption}</figcaption></figure>,
})();

export const imageTextBlock = createReactBlockSpec({
  type: 'imageText', content: 'none', layoutOnly: true,
  propSchema: { ...nativeImage.config.propSchema, side: { default: 'left', values: ['left', 'right'] }, imageWidth: { default: 40 } },
}, {
  renderFrame: ({ block, editor, slotRef }) => <div className="image-text-editor">
    <ImageControls block={block} editor={editor} />
    <div className="image-text-layout" data-side={block.props.side} style={{ '--image-width': `${block.props.imageWidth}%` }}>
      <figure contentEditable={false}><img src={block.props.url} alt={block.props.name || '文章配图'} draggable={false} />{block.props.caption && <figcaption>{block.props.caption}</figcaption>}</figure>
      <div className="image-text-copy" ref={slotRef} />
    </div>
  </div>,
  toExternalHTML: ({ block, childrenRef }) => <div className="image-text-layout" data-side={block.props.side} style={{ '--image-width': `${block.props.imageWidth}%` }}><figure><img src={block.props.url} alt={block.props.name} />{block.props.caption && <figcaption>{block.props.caption}</figcaption>}</figure><div ref={childrenRef} /></div>,
})();
