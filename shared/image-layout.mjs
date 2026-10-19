// Keep the asset and all authored text when switching between stacked and side-by-side layouts.
export function imageProps(props = {}) {
  return Object.fromEntries(['url', 'name', 'caption', 'showPreview', 'previewWidth', 'textAlignment', 'backgroundColor', 'imageOffset'].filter(key => props[key] !== undefined).map(key => [key, props[key]]));
}
export function imageLayoutReplacement(block, layout) {
  const props = imageProps(block.props);
  if (layout === 'image-left' || layout === 'text-left') return [{
    id: block.id, type: 'imageText', props: { ...props, textAlignment: 'left', side: layout === 'text-left' ? 'right' : 'left', imageWidth: block.props.imageWidth || 40 },
    children: block.children?.length ? block.children : [{ type: 'paragraph', content: [] }],
  }];
  return [{ id: block.id, type: 'image', props: { ...props, textAlignment: layout, imageOffset: layout === 'right' ? 100 : layout === 'center' ? 50 : 0 } }, ...(block.children || [])];
}
