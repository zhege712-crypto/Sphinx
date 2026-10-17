import { referenceIdFromLink } from './reference-links.mjs';
export class InputError extends Error {}
export const emptyDocument = () => [{ type: 'paragraph', content: [] }];
export const demoDocument = () => [
  { id: 'demo-heading', type: 'heading', props: { level: 1 }, content: '在这里开始写作' },
  { type: 'paragraph', content: '这是编辑功能的演示文档，正式指南内容由你和伙伴填写。选中文字可排版，输入 / 可插入图片、表格和列表。' },
  { id: 'demo-table-heading', type: 'heading', props: { level: 2 }, content: '表格示例' },
  { type: 'table', content: { type: 'tableContent', rows: [
    { cells: ['项目', '说明', '备注'] }, { cells: ['示例内容', '可以直接编辑单元格', '按需填写'] },
  ] } },
  { id: 'demo-image-heading', type: 'heading', props: { level: 2 }, content: '插入图片' },
  { type: 'paragraph', content: '直接粘贴截图，或通过上方图片按钮上传。未发布图片仅供已登录伙伴访问。' },
  { type: 'paragraph', content: [] },
];

const blockTypes = new Set(['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'checkListItem', 'quote', 'codeBlock', 'image', 'imageText', 'table', 'toggleListItem', 'divider', 'linkCard']);
const colors = new Set(['default', 'gray', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']);
const alignments = new Set(['left', 'center', 'right', 'justify']);
export const safeTitle = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 160) throw new InputError('标题应为 1–160 个字符');
  return value.trim();
};
export function safeLink(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new InputError('链接格式不正确');
  if (referenceIdFromLink(value)) return value;
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error();
    return parsed.href;
  } catch { throw new InputError('链接仅支持站内 Reference 词条、http、https 或 mailto'); }
}
export const assetIdFromUrl = (url) => typeof url === 'string' ? /^\/api\/assets\/([a-f0-9-]{36})$/.exec(url)?.[1] : undefined;

export function sanitizeDocument(input) {
  if (!Array.isArray(input) || input.length > 1500 || JSON.stringify(input).length > 350000) throw new InputError('文档过大，请拆分成多个章节');
  let count = 0;
  const inline = (content, depth = 0) => {
    if (depth > 1) throw new InputError('链接不可重复嵌套');
    if (typeof content === 'string') return [{ type: 'text', text: content, styles: {} }];
    if (!Array.isArray(content)) return [];
    return content.map((entry) => {
      if (!entry || typeof entry !== 'object') throw new InputError('正文格式不正确');
      if (entry.type === 'link') return { type: 'link', href: safeLink(entry.href), content: inline(entry.content, depth + 1).filter((part) => part.type === 'text') };
      if (entry.type !== 'text' || typeof entry.text !== 'string') throw new InputError('暂不支持该内联内容');
      const styles = {};
      for (const key of ['bold', 'italic', 'underline', 'strike', 'code']) if (entry.styles?.[key] === true) styles[key] = true;
      for (const key of ['textColor', 'backgroundColor']) if (colors.has(entry.styles?.[key])) styles[key] = entry.styles[key];
      return { type: 'text', text: entry.text, styles };
    });
  };
  const visit = (blocks, depth = 0) => {
    if (depth > 12) throw new InputError('嵌套层级过深');
    return blocks.map((block) => {
      if (++count > 2500 || !block || !blockTypes.has(block.type)) throw new InputError('文档包含未支持的内容块');
      const props = {};
      const raw = block.props ?? {};
      for (const key of ['textColor', 'backgroundColor']) if (colors.has(raw[key])) props[key] = raw[key];
      if (alignments.has(raw.textAlignment)) props.textAlignment = raw.textAlignment;
      if (block.type === 'heading') props.level = [1, 2, 3].includes(raw.level) ? raw.level : 2;
      if (block.type === 'checkListItem') props.checked = raw.checked === true;
      if (block.type === 'numberedListItem' && Number.isInteger(raw.start) && raw.start > 0 && raw.start < 10000) props.start = raw.start;
      if (block.type === 'codeBlock') props.language = /^[a-z0-9+#.-]{1,35}$/i.test(raw.language ?? '') ? raw.language : 'text';
      let content;
      if (block.type === 'linkCard') {
        props.title = typeof raw.title === 'string' ? raw.title.slice(0, 160) : '';
        props.url = raw.url ? safeLink(raw.url) : '';
        if (props.url && !/^https?:\/\//.test(props.url)) throw new InputError('网站卡片只支持 http 或 https 链接');
      } else if (block.type === 'image' || block.type === 'imageText') {
        if (raw.url && !assetIdFromUrl(raw.url)) throw new InputError('请上传图片；首版不接受外部图片地址');
        props.url = raw.url || '';
        props.name = typeof raw.name === 'string' ? raw.name.slice(0, 180) : '';
        props.caption = typeof raw.caption === 'string' ? raw.caption.slice(0, 1000) : '';
        props.showPreview = raw.showPreview !== false;
        if (Number.isFinite(raw.previewWidth)) props.previewWidth = Math.max(64, Math.min(raw.previewWidth, 1600));
        if (block.type === 'imageText') {
          props.side = raw.side === 'right' ? 'right' : 'left';
          props.imageWidth = Number.isFinite(raw.imageWidth) ? Math.max(25, Math.min(65, raw.imageWidth)) : 40;
        }
      } else if (block.type === 'table') {
        if (!Array.isArray(block.content?.rows) || block.content.rows.length > 150) throw new InputError('表格最多 150 行');
        content = { type: 'tableContent', rows: block.content.rows.map((row) => {
          if (!Array.isArray(row.cells) || row.cells.length > 25) throw new InputError('表格最多 25 列');
          return { cells: row.cells.map((cell) => {
            const p = cell?.props ?? {};
            const cellProps = {};
            if (alignments.has(p.textAlignment)) cellProps.textAlignment = p.textAlignment;
            for (const key of ['textColor', 'backgroundColor']) if (colors.has(p[key])) cellProps[key] = p[key];
            for (const key of ['colspan', 'rowspan']) if (Number.isInteger(p[key]) && p[key] > 0 && p[key] <= 25) cellProps[key] = p[key];
            return { type: 'tableCell', props: cellProps, content: inline(typeof cell === 'string' || Array.isArray(cell) ? cell : cell?.content) };
          }) };
        }) };
        if (block.content.headerRows === 1) content.headerRows = 1;
        if (Array.isArray(block.content.columnWidths)) content.columnWidths = block.content.columnWidths.slice(0, 25).map((w) => Number.isFinite(w) ? Math.max(40, Math.min(w, 1200)) : undefined);
      } else if (block.type === 'codeBlock') content = typeof block.content === 'string' ? block.content : documentText([{ content: block.content }]);
      else if (block.type !== 'divider') content = inline(block.content);
      const clean = { type: block.type, props };
      if (typeof block.id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(block.id)) clean.id = block.id;
      if (content !== undefined) clean.content = content;
      if (Array.isArray(block.children) && block.children.length) clean.children = visit(block.children, depth + 1);
      return clean;
    });
  };
  return visit(input.length ? input : emptyDocument());
}

export function documentText(blocks) {
  const text = (value) => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join('') : value?.text ?? (value?.content ? text(value.content) : '');
  return (blocks ?? []).map((block) => [block.type === 'table' ? block.content.rows.map((row) => row.cells.map(text).join(' ')).join('\n') : block.type === 'linkCard' ? `${block.props.title || ''} ${block.props.url || ''}` : text(block.content), documentText(block.children)].filter(Boolean).join('\n')).join('\n');
}
export function collectAssets(blocks) {
  const ids = new Set();
  for (const block of blocks) {
    const id = assetIdFromUrl(block.props?.url);
    if (id) ids.add(id);
    if (block.children) for (const childId of collectAssets(block.children)) ids.add(childId);
  }
  return [...ids];
}
export function publicBlocks(blocks, assets) {
  return blocks.map((block) => ({ ...block, props: ['image', 'imageText'].includes(block.type) && block.props.url ? { ...block.props, url: `assets/${assetIdFromUrl(block.props.url)}.${assets.get(assetIdFromUrl(block.props.url))?.extension}` } : block.props, ...(block.children ? { children: publicBlocks(block.children, assets) } : {}) }));
}
export function imageType(bytes) {
  const b = new Uint8Array(bytes);
  if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) return { mime: 'image/png', extension: 'png' };
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  const head = String.fromCharCode(...b.slice(0, 12));
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return { mime: 'image/gif', extension: 'gif' };
  if (head.startsWith('RIFF') && head.slice(8) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  throw new InputError('只接受真实的 PNG、JPEG、GIF 或 WebP 图片，不接受 SVG 和其他附件');
}
