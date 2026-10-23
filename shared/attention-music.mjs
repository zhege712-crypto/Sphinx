export const ATTENTION_REFERENCE_ID = '56ef3fdc-3ea0-4e16-a850-73531b427805';

// The player stays absent until the owner's recording has been supplied.
export function attentionTrack(document, assets = {}) {
  if (document?.id !== ATTENTION_REFERENCE_ID || document.kind !== 'reference' || document.section === 'valhalla') return null;
  for (const extension of ['mp3', 'm4a', 'wav']) {
    const src = assets[`./assets/audio/attention-all-you-need-is-love.${extension}`];
    if (typeof src === 'string' && src) return {
      src,
      title: 'All You Need Is Love',
      artist: 'The Beatles',
      href: 'https://www.thebeatles.com/all-you-need-love',
    };
  }
  return null;
}
