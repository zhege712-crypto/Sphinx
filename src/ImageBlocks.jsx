import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { defaultBlockSpecs } from '@blocknote/core';
import { SideMenuExtension } from '@blocknote/core/extensions';
import { createReactBlockSpec } from '@blocknote/react';
import { ArrowDown, ArrowUp, GripVertical, MoveHorizontal, Scaling, Wallpaper } from 'lucide-react';
import { imageLayoutReplacement } from '../shared/image-layout.mjs';
import { draggedImageOffset, imageOffset, imagePositionStyle, imageSideAt, resizedBesideWidth, resizedImageWidth } from '../shared/image-position.mjs';
import './image-interaction.css';

const nativeImage = defaultBlockSpecs.image;
const imagePropSchema = { ...nativeImage.config.propSchema, imageOffset: { default: undefined, type: 'number' } };

// Keep pointer previews local. One completed gesture becomes one editor update,
// while Escape, pointer cancellation and unmount leave saved content untouched.
function useImageGesture() {
  const active = useRef();
  useEffect(() => () => active.current?.abort(), []);
  return (event, move, finish, cancel) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    const options = { signal: controller.signal };
    const startX = event.clientX; const pointerId = event.pointerId; let changed = false;
    const reset = () => { controller.abort(); active.current = undefined; };
    window.addEventListener('pointermove', next => {
      if (next.pointerId !== pointerId) return;
      if (Math.abs(next.clientX - startX) > 3) changed = true;
      if (changed) move(next, next.clientX - startX);
    }, options);
    window.addEventListener('pointerup', next => { if (next.pointerId === pointerId) { reset(); changed ? finish() : cancel(); } }, options);
    window.addEventListener('pointercancel', next => { if (next.pointerId === pointerId) { reset(); cancel(); } }, options);
    window.addEventListener('keydown', key => {
      if (key.key === 'Escape') { key.preventDefault(); reset(); cancel(); }
    }, options);
    window.addEventListener('blur', () => { reset(); cancel(); }, options);
  };
}

function ResolvedImage({ block, ...props }) {
  // Same-origin asset URLs stay private in the editor. The document publication
  // process remains responsible for replacing them with public asset URLs.
  return <img src={block.props.url} alt={block.props.name || ''} draggable={false} {...props} />;
}

function ImageBlockMovement({ block, editor }) {
  const dragging = useRef(false);
  useEffect(() => () => {
    // A successful drop can remount this node view before its old drag handle
    // receives dragend. Release BlockNote's drag image in that case as well.
    if (dragging.current) { dragging.current = false; editor.getExtension(SideMenuExtension)?.blockDragEnd(); }
  }, [editor]);
  return <div className="image-block-movement" aria-label="移动图片段落">
    <button type="button" draggable aria-label="拖动图片段落" title="拖到正文中的新位置；也可用旁边的上移、下移"
      onDragStart={event => { dragging.current = true; editor.getExtension(SideMenuExtension)?.blockDragStart(event, editor.getBlock(block.id)); }}
      onDragEnd={() => { dragging.current = false; editor.getExtension(SideMenuExtension)?.blockDragEnd(); }}><GripVertical size={15} /><span>移动段落</span></button>
    <button type="button" aria-label="图片段落上移" title="图片段落上移" onClick={() => editor.moveBlocksUp(block.id)}><ArrowUp size={15} /></button>
    <button type="button" aria-label="图片段落下移" title="图片段落下移" onClick={() => editor.moveBlocksDown(block.id)}><ArrowDown size={15} /></button>
    <button type="button" className="image-background-action" onClick={() => window.dispatchEvent(new CustomEvent('sphinx:set-background', { detail: { url: block.props.url, name: block.props.name } }))}><Wallpaper size={15} />设为背景</button>
  </div>;
}

function ImageControls({ block, editor }) {
  const root = useRef();
  const [available, setAvailable] = useState(800);
  const [width, setWidth] = useState(String(block.props.previewWidth || ''));
  const beside = block.type === 'imageText';
  useEffect(() => setWidth(String(block.props.previewWidth || '')), [block.props.previewWidth]);
  useLayoutEffect(() => {
    // Node views initially mount detached from the editor. Observe the control
    // itself so the available width is corrected once the view is attached.
    const paper = root.current;
    if (!paper) return;
    const observer = new ResizeObserver(() => setAvailable(Math.max(64, Math.floor(paper.clientWidth))));
    observer.observe(paper); return () => observer.disconnect();
  }, []);
  const update = props => editor.updateBlock(block, { props });
  const alignment = block.props.textAlignment || 'left';
  const customPosition = !beside && imageOffset(block.props) !== imageOffset({ textAlignment: alignment });
  const layout = beside ? block.props.side === 'right' ? 'text-left' : 'image-left' : customPosition ? 'custom' : alignment;
  function changeLayout(value) {
    const replacement = imageLayoutReplacement(editor.getBlock(block.id), value);
    editor.replaceBlocks([block.id], replacement);
  }
  return <div className="image-controls" ref={root} contentEditable={false} onMouseDown={e => e.stopPropagation()}>
    <ImageBlockMovement block={block} editor={editor} />
    <div className="image-controls-row">
      <label>排版<select aria-label="图片排版" value={layout} onChange={e => changeLayout(e.target.value)}>
        {customPosition && <option value="custom" disabled>单图 · 自由位置</option>}
        <option value="left">单图 · 靠左</option><option value="center">单图 · 居中</option><option value="right">单图 · 靠右</option>
        <option value="image-left">图左文右</option><option value="text-left">文左图右</option>
      </select></label>
      {beside ? <label className="image-size-control">图片占宽<input aria-label="图片占宽" type="range" min="25" max="65" step="5" value={block.props.imageWidth} onChange={e => update({ imageWidth: Number(e.target.value) })} /><output>{block.props.imageWidth}%</output></label> : <>
        <label className="image-size-control">尺寸<input aria-label="图片宽度滑杆" type="range" min="64" max={Math.max(available, block.props.previewWidth || 0)} step="1" value={block.props.previewWidth || available} onChange={e => update({ previewWidth: Number(e.target.value) })} /></label>
        <label className="image-pixel-control"><input className="image-width-input" aria-label="图片宽度（像素）" type="number" min="64" max="1600" placeholder="自动" value={width} aria-invalid={!!width && (!Number.isFinite(Number(width)) || Number(width) < 64 || Number(width) > 1600)} onChange={e => { setWidth(e.target.value); const n = Number(e.target.value); if (n >= 64 && n <= 1600) update({ previewWidth: n }); }} onBlur={() => { if (!width) update({ previewWidth: undefined }); else { const n = Math.max(64, Math.min(1600, Number(width) || available)); setWidth(String(n)); update({ previewWidth: n }); } }} />px</label>
        <div className="image-presets" aria-label="图片尺寸预设">{[[.33, '小'], [.66, '中'], [1, '满宽']].map(([scale, label]) => <button type="button" key={label} onClick={() => update({ previewWidth: Math.max(64, Math.round(available * scale)) })}>{label}</button>)}</div>
      </>}
    </div>
    {!beside && <label className="image-position-control">横向位置<input aria-label="图片横向位置" type="range" min="0" max="100" value={imageOffset(block.props)} onChange={e => update({ imageOffset: Number(e.target.value) })} /><output>{Math.round(imageOffset(block.props))}%</output></label>}
    <label className="image-caption-control">图注<input aria-label="图片说明" maxLength={1000} placeholder="添加图片说明（选填）" value={block.props.caption} onChange={e => update({ caption: e.target.value })} /></label>
  </div>;
}

function EmptyImage({ block, editor }) {
  const host = useRef();
  useEffect(() => {
    const rendered = nativeImage.implementation.render(block, editor);
    host.current.replaceChildren(rendered.dom);
    return () => rendered.destroy?.();
  }, [block, editor]);
  return <div className="native-image-host" ref={host} />;
}

function EditableImage({ block, editor }) {
  const lane = useRef(); const figure = useRef();
  const [draft, setDraft] = useState(null);
  const gesture = useImageGesture();
  const props = { ...block.props, ...draft };
  function start(event, mode, direction = 1) {
    const laneWidth = lane.current.clientWidth;
    const width = figure.current.getBoundingClientRect().width;
    const offset = imageOffset(block.props); let next = {};
    gesture(event, (_, delta) => {
      next = mode === 'move' ? { imageOffset: draggedImageOffset(offset, delta, laneWidth, width) } : { previewWidth: resizedImageWidth(width, delta, direction, laneWidth) };
      setDraft(next);
    }, () => { editor.updateBlock(block.id, { props: next }); setDraft(null); }, () => setDraft(null));
  }
  if (!block.props.url || block.props.showPreview === false) return <div className="image-editor" contentEditable={false}><EmptyImage block={block} editor={editor} />{block.props.url && <ImageControls block={block} editor={editor} />}</div>;
  return <div className="image-editor" contentEditable={false}>
    <div ref={lane} className={`image-position-lane${draft ? ' is-adjusting' : ''}`}>
      <figure ref={figure} className="image-position-figure" style={{ ...imagePositionStyle(props), width: props.previewWidth || '100%' }}>
        <ResolvedImage block={block} onPointerDown={event => start(event, 'move')} />
        <button type="button" className="image-position-grip" aria-label="拖动图片调整横向位置" title="左右拖动图片；横向位置滑杆也可调整" onPointerDown={event => start(event, 'move')} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); editor.updateBlock(block.id, { props: { imageOffset: Math.max(0, Math.min(100, imageOffset(block.props) + (event.key === 'ArrowLeft' ? -5 : 5))) } }); }
        }}><MoveHorizontal size={15} />拖动</button>
        {[-1, 1].map(direction => <button key={direction} type="button" className={`image-resize-grip ${direction < 0 ? 'is-left' : 'is-right'}`} aria-label={direction < 0 ? '从左侧调整图片大小' : '从右侧调整图片大小'} title="拖动调整大小；左右方向键每次调整 10 像素" onPointerDown={event => start(event, 'resize', direction)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); editor.updateBlock(block.id, { props: { previewWidth: resizedImageWidth(figure.current.clientWidth, event.key === 'ArrowRight' ? 10 : -10, direction, lane.current.clientWidth) } }); }
        }}><Scaling size={14} /></button>)}
        {block.props.caption && <figcaption>{block.props.caption}</figcaption>}
      </figure>
    </div>
    <p className="image-interaction-hint">拖动图片调整左右位置，拖动底角改变大小；移动到其他段落请用“移动段落”。</p>
    <ImageControls block={block} editor={editor} />
  </div>;
}

function ImageTextFrame({ block, editor, slotRef }) {
  const layout = useRef(); const [draft, setDraft] = useState(null);
  const gesture = useImageGesture(); const props = { ...block.props, ...draft };
  function start(event, resize = false) {
    const rect = layout.current.getBoundingClientRect(); let next = {};
    gesture(event, (pointer, delta) => {
      next = resize ? { imageWidth: resizedBesideWidth(block.props.imageWidth, delta, block.props.side === 'right' ? -1 : 1, rect.width) } : { side: imageSideAt(pointer.clientX, rect.left, rect.width) };
      setDraft(next);
    }, () => { editor.updateBlock(block.id, { props: next }); setDraft(null); }, () => setDraft(null));
  }
  return <div className="image-text-editor">
    <ImageControls block={block} editor={editor} />
    <div ref={layout} className={`image-text-layout${draft ? ' is-adjusting' : ''}`} data-side={props.side} style={{ '--image-width': `${props.imageWidth}%` }}>
      <figure contentEditable={false} className="image-beside-figure">
        <ResolvedImage block={block} onPointerDown={event => start(event)} />
        <button type="button" className="image-position-grip" aria-label="拖动图片切换图文左右位置" title="拖到左侧或右侧；左右方向键也可切换" onPointerDown={event => start(event)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); editor.updateBlock(block.id, { props: { side: event.key === 'ArrowLeft' ? 'left' : 'right' } }); }
        }}><MoveHorizontal size={15} />换边</button>
        <button type="button" className="image-beside-resize" aria-label="拖动调整图文图片占宽" title="拖动调整图片占宽；左右方向键每次调整 5%" onPointerDown={event => start(event, true)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); editor.updateBlock(block.id, { props: { imageWidth: Math.max(25, Math.min(65, block.props.imageWidth + (event.key === 'ArrowRight' ? 5 : -5) * (block.props.side === 'right' ? -1 : 1))) } }); }
        }}><GripVertical size={15} /></button>
        {block.props.caption && <figcaption>{block.props.caption}</figcaption>}
      </figure>
      <div className="image-text-copy" ref={slotRef} />
    </div>
    <p className="image-interaction-hint">拖动图片切换左右位置，拖动图文分隔手柄调整占宽。</p>
  </div>;
}

export const imageBlock = createReactBlockSpec({ ...nativeImage.config, propSchema: imagePropSchema }, {
  meta: nativeImage.implementation.meta,
  parse: nativeImage.implementation.parse,
  render: EditableImage,
  toExternalHTML: ({ block }) => <figure style={imagePositionStyle(block.props)}><img src={block.props.url} alt={block.props.name} width={block.props.previewWidth} /><figcaption>{block.props.caption}</figcaption></figure>,
})();

export const imageTextBlock = createReactBlockSpec({
  type: 'imageText', content: 'none', layoutOnly: true,
  propSchema: { ...imagePropSchema, side: { default: 'left', values: ['left', 'right'] }, imageWidth: { default: 40 } },
}, {
  renderFrame: ImageTextFrame,
  toExternalHTML: ({ block, childrenRef }) => <div className="image-text-layout" data-side={block.props.side} style={{ '--image-width': `${block.props.imageWidth}%` }}><figure><img src={block.props.url} alt={block.props.name} />{block.props.caption && <figcaption>{block.props.caption}</figcaption>}</figure><div ref={childrenRef} /></div>,
})();
