const idPattern = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const referenceLinkPattern = new RegExp(`^#/reference/(${idPattern})$`);
export const referenceIdFromLink = value => typeof value === 'string' ? referenceLinkPattern.exec(value)?.[1] : undefined;
export function referenceHref(id) {
  const href = `#/reference/${id}`;
  if (!referenceIdFromLink(href)) throw new Error('Reference 词条地址不正确');
  return href;
}
