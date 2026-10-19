const asset = /^\/api\/assets\/[a-f0-9-]{36}$/;
const publishedAsset = /^assets\/[a-f0-9-]{36}\.(png|jpg|gif|webp)$/;
export const backgroundDefaults = { url: '', name: '', preset: 'none', blur: 0, opacity: 25, positionX: 50, positionY: 50, enabled: true };
const bounded = (value, fallback, max) => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
export function backgroundProps(raw = {}) {
  if (raw.url && !asset.test(raw.url)) throw new Error('背景请使用已上传的图片');
  const enabled = raw.enabled !== false;
  return { url: enabled ? raw.url || '' : '', name: enabled && typeof raw.name === 'string' ? raw.name.slice(0, 180) : '', preset: enabled && raw.preset === 'windows' ? 'windows' : 'none', blur: bounded(raw.blur, 0, 30), opacity: bounded(raw.opacity, 25, 100), positionX: bounded(raw.positionX, 50, 100), positionY: bounded(raw.positionY, 50, 100), enabled };
}
export function pageBackground(document) {
  if (!document) return null;
  const authored = document.blocks?.find(block => block.type === 'pageBackground');
  if (authored) return { ...backgroundDefaults, ...authored.props };
  return document.kind === 'reference' && document.title?.trim().toLocaleLowerCase() === 'windows' ? { ...backgroundDefaults, preset: 'windows', opacity: 65 } : null;
}
export function backgroundImage(props, privatePreview = false) {
  if (!props?.enabled) return '';
  if (props.url) return (privatePreview ? asset : publishedAsset).test(props.url) ? props.url : '';
  return props.preset === 'windows' ? 'backgrounds/windows-bliss.jpg' : '';
}
