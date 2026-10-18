import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useMediaQuery from './useMediaQuery';
import { safeLink } from '../shared/document.mjs';
import { groupLists } from '../shared/list-groups.mjs';
import { WebsiteCard } from './WebsiteCard';
import CopyBlock from './CopyBlock';
import CodeDemo from './CodeDemo';
export const inlineText = (value) => typeof value === 'string' ? value : Array.isArray(value) ? value.map(inlineText).join('') : value?.text || inlineText(value?.content || []);
export function headings(blocks) { return (blocks || []).flatMap((b) => [...(b.type === 'heading' ? [{ id: b.id, text: inlineText(b.content), level: b.props?.level || 2 }] : []), ...headings(b.children)]); }
function Inline({ value }) {
  if (typeof value === 'string') return value;
  return (value || []).map((part, i) => {
    if (part.type === 'link') { let href; try { href = safeLink(part.href); } catch { href = undefined; } return <a key={i} href={href} target={/^https?:/.test(href || '') ? '_blank' : undefined} rel="noopener noreferrer"><Inline value={part.content} /></a>; }
    let text = part.text || '';
    if (part.styles?.code) text = <code>{text}</code>;
    if (part.styles?.bold) text = <strong>{text}</strong>;
    if (part.styles?.italic) text = <em>{text}</em>;
    if (part.styles?.underline) text = <u>{text}</u>;
    if (part.styles?.strike) text = <s>{text}</s>;
    const color = { gray: '#626975', brown: '#795640', red: '#c33439', orange: '#a24e0b', yellow: '#876500', green: '#237442', blue: '#245bdb', purple: '#7941a4', pink: '#ac3572' };
    return <span key={i} style={{ color: color[part.styles?.textColor], background: part.styles?.backgroundColor && part.styles.backgroundColor !== 'default' ? `${color[part.styles.backgroundColor]}18` : undefined }}>{text}</span>;
  });
}
export function Reader({ blocks, privatePreview = false }) {
  return <div className="reader-body">{groupLists(blocks).map((group, index) => {
    if (group.kind === 'list') {
      const List = group.type === 'numberedListItem' ? 'ol' : 'ul';
      return <List key={group.blocks[0].id || index} start={List === 'ol' ? group.start : undefined}>{group.blocks.map((item, i) => <li key={item.id || i} id={`block-${item.id}`} style={{ textAlign: item.props?.textAlignment }}><Inline value={item.content} />{item.children?.length ? <Reader blocks={item.children} privatePreview={privatePreview} /> : null}</li>)}</List>;
    }
    const b = group.block;
    const content = <Inline value={b.content} />;
    const nested = b.children?.length ? <Reader blocks={b.children} privatePreview={privatePreview} /> : null;
    const key = b.id || index;
    const props = { id: `block-${b.id}`, style: { textAlign: b.props?.textAlignment } };
    if (b.type === 'codeDemo') return <React.Fragment key={key}><CodeDemo id={props.id} {...b.props} />{nested}</React.Fragment>;
    if (b.type === 'linkCard') return <div key={key} {...props}><WebsiteCard title={b.props.title} url={b.props.url} />{nested}</div>;
    if (b.type === 'heading') { const H = `h${Math.min(3, Math.max(1, b.props?.level || 2))}`; return <React.Fragment key={key}><H {...props}>{content}</H>{nested}</React.Fragment>; }
    if (b.type === 'table') return <div key={key} {...props} className="table-scroll"><table><tbody>{b.content.rows.map((row, r) => <tr key={r}>{row.cells.map((cell, c) => { const Cell = r === 0 && b.content.headerRows === 1 ? 'th' : 'td'; return <Cell key={c} colSpan={cell.props?.colspan} rowSpan={cell.props?.rowspan}><Inline value={typeof cell === 'string' || Array.isArray(cell) ? cell : cell.content} /></Cell>; })}</tr>)}</tbody></table>{nested}</div>;
    if (b.type === 'codeBlock') return <CopyBlock key={key} id={props.id} text={inlineText(b.content)} language={b.props?.language} />;
    if (b.type === 'divider') return <hr key={key} {...props} />;
    if (b.type === 'image' || b.type === 'imageText') {
      const url = b.props?.url || '';
      const safe = privatePreview ? /^\/api\/assets\/[a-f0-9-]{36}$/.test(url) : /^assets\/[a-f0-9-]{36}\.(png|jpg|gif|webp)$/.test(url);
      const figure = <figure style={b.type === 'image' ? { width: b.props.previewWidth ? Math.min(1600, Math.max(64, b.props.previewWidth)) : undefined, maxWidth: '100%', marginLeft: b.props.textAlignment === 'right' || b.props.textAlignment === 'center' ? 'auto' : 0, marginRight: b.props.textAlignment === 'center' ? 'auto' : 0 } : undefined}><img src={url} alt={b.props.name || b.props.caption || '文章配图'} loading="lazy" />{b.props.caption && <figcaption>{b.props.caption}</figcaption>}</figure>;
      if (b.type === 'imageText') return <div key={key} {...props} className="image-text-layout" data-side={b.props.side === 'right' ? 'right' : 'left'} style={{ '--image-width': `${Math.max(25, Math.min(65, b.props.imageWidth || 40))}%` }}>{safe ? figure : null}<div className="image-text-copy">{nested}</div></div>;
      return safe ? <React.Fragment key={key}><div {...props}>{figure}</div>{nested}</React.Fragment> : nested;
    }
    if (b.type === 'quote') return <blockquote key={key} {...props}>{content}{nested}</blockquote>;
    if (b.type === 'toggleListItem') return <details key={key} {...props}><summary>{content}</summary>{nested}</details>;
    if (b.type === 'checkListItem') return <div key={key} {...props} className="read-check"><input type="checkbox" checked={!!b.props?.checked} readOnly aria-label={inlineText(b.content)} /><span>{content}{nested}</span></div>;
    return <React.Fragment key={key}><p {...props}>{content || <br />}</p>{nested}</React.Fragment>;
  })}</div>;
}
export function Outline({ blocks, editing = false }) {
  const compact = useMediaQuery('(max-width: 1100px)');
  const [expanded, setExpanded] = useState(false);
  const summary = useRef();
  const items = headings(blocks);
  return <aside className="outline" aria-label="本文目录"><details open={!compact || expanded} onToggle={e => { if (compact) setExpanded(e.currentTarget.open); }}><summary ref={summary} tabIndex={compact ? 0 : -1} onClick={e => { if (!compact) e.preventDefault(); }}>本文目录<ChevronDown size={16} /></summary>{items.length ? <nav>{items.map((item, i) => <button key={item.id || i} style={{ paddingLeft: 14 + (item.level - 1) * 12 }} onClick={() => {
    const target = editing ? document.querySelector(`[data-id="${CSS.escape(item.id || '')}"]`) : document.getElementById(`block-${item.id}`);
    if (compact) { setExpanded(false); summary.current?.focus({ preventScroll: true }); }
    // Wait for the disclosure to collapse before calculating the scroll position.
    requestAnimationFrame(() => target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
  }}>{item.text || '未命名标题'}</button>)}</nav> : <p>添加标题后，<br />这里会自动生成大纲。</p>}</details></aside>;
}
